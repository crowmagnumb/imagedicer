import sharp, { OverlayOptions, Sharp } from "sharp";
import cla from "command-line-args";

const defs = [
    {
        name: "image",
        alias: "i",
        type: String,
        defaultOption: true,
    },
    {
        name: "ratio",
        alias: "r",
        type: Number,
        defaultValue: 1,
    },
    {
        name: "chunks",
        alias: "c",
        type: Number,
    },
    {
        name: "size",
        alias: "s",
        type: Number,
    },
    {
        name: "output",
        alias: "o",
        type: String,
        defaultValue: "diced.png",
    },
    {
        name: "type",
        alias: "t",
        type: String,
        defaultValue: "dice",
    },
];
const options = cla(defs);

type ImageSize = { width: number; height: number };

function blankImage(width: number, height: number) {
    return sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    });
}

function isOdd(num: number) {
    return num % 2 === 1;
}

const writeOutput = (image: Sharp) => {
    return image.png().toFile(options.output);
};

const dice = (image: Sharp, imageSize: ImageSize) => {
    const getChunks = (imageSize: number, gap: number, size: number) => {
        return Math.round((imageSize / gap - 1) / (1 + size / gap));
    };

    let size: number;
    let chunks: number;
    let gap: number;
    if (options.size) {
        gap = Math.round(options.size / options.ratio);
        size = options.size;
        chunks = getChunks(imageSize.width, gap, options.size);
    } else {
        chunks = options.chunks || 20;
        gap = Math.round(imageSize.width / ((options.ratio + 1) * chunks) + 1);
        size = Math.round(options.ratio * gap);
    }

    const newImageWidth = chunks * size;
    const newImageHeight = getChunks(imageSize.height, gap, size) * size;

    const index2Pixels = (index: number) => {
        return gap + index * (gap + size);
    };
    const index2PixelsOverlay = (index: number) => {
        return index * size;
    };

    let done = false;
    let ix = 0;
    let iy = 0;

    const promises: Promise<OverlayOptions>[] = [];

    while (!done) {
        //
        // NOTE: Need to do this outside the then because by the time
        // the then fires the ix's have changed! That or we need to set ix to another variable, say iix.
        //
        const left = index2PixelsOverlay(ix);
        const top = index2PixelsOverlay(iy);
        promises.push(
            image
                .extract({
                    left: index2Pixels(ix),
                    top: index2Pixels(iy),
                    width: size,
                    height: size,
                })
                .toBuffer()
                .then((input) => {
                    return {
                        input,
                        left,
                        top,
                    };
                })
        );

        ix++;
        if (index2Pixels(ix) + size > imageSize.width) {
            ix = 0;
            iy++;
            if (index2Pixels(iy) + size > imageSize.height) {
                done = true;
            }
        }
    }

    Promise.all(promises).then((overlays) => {
        writeOutput(
            blankImage(newImageWidth, newImageHeight).composite(overlays)
        );
    });
};

let image = sharp(options.image);
image
    .metadata()
    .then((data) => {
        if (!data.width || !data.height) {
            throw "Image size unknown";
        }

        return { width: data.width, height: data.height } as ImageSize;
    })
    .then((imageSize) => {
        switch (options.type) {
            case "dice":
                dice(image, imageSize);
                break;
            case "blah":
                const getChunks = (imageSize: number, size: number) => {
                    return Math.round(imageSize / size);
                };
                let size: number;
                let chunks: number;
                if (options.size) {
                    size = options.size;
                    chunks = getChunks(imageSize.width, options.size);
                } else {
                    size = Math.round(imageSize.width / options.chunks);
                    chunks = options.chunks;
                }
                let ychunks = getChunks(imageSize.height, size);
                const newImageWidth = chunks * size;
                const newImageHeight = ychunks * size;

                const promises: Promise<OverlayOptions>[] = [];
                for (let ii = 0; ii < chunks; ii++) {
                    const left = ii * size;
                    promises.push(
                        image
                            .extract({
                                left,
                                top: 0,
                                width: size,
                                height: imageSize.height,
                            })
                            .flop(isOdd(ii))
                            // .rotate(isOdd(ii) ? 180 : 0)
                            .toBuffer()
                            .then((input) => {
                                return {
                                    input,
                                    left,
                                    top: 0,
                                };
                            })
                    );
                }

                Promise.all(promises).then(async (overlays) => {
                    // let buffer = await blankImage(newImageWidth, newImageHeight)
                    //     .composite(overlays)
                    //     .toBuffer();

                    // image = sharp(buffer);

                    await writeOutput(
                        blankImage(newImageWidth, newImageHeight).composite(
                            overlays
                        )
                    );

                    // return;

                    image = sharp(options.output);

                    const promises: Promise<OverlayOptions>[] = [];
                    for (let ii = 0; ii < ychunks; ii++) {
                        const top = ii * size;
                        // console.log(ii, top);
                        promises.push(
                            image
                                .extract({
                                    left: 0,
                                    top,
                                    width: newImageWidth,
                                    height: size,
                                })
                                .flip(isOdd(ii))
                                .toBuffer()
                                .then((input) => {
                                    // console.log(top, input);
                                    return {
                                        input,
                                        left: 0,
                                        top,
                                    };
                                })
                        );
                    }

                    Promise.all(promises).then((overlays) => {
                        writeOutput(
                            blankImage(newImageWidth, newImageHeight).composite(
                                overlays
                            )
                        );
                    });
                });
                break;
        }
    });
