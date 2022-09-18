import sharp, { OverlayOptions } from "sharp";
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
];
const options = cla(defs);

const image = sharp(options.image);

type ImageSize = { width: number; height: number };

function getChunks(imageSize: number, gap: number, size: number) {
    return Math.round((imageSize / gap - 1) / (1 + size / gap));
}

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

image
    .metadata()
    .then((data) => {
        if (!data.width || !data.height) {
            throw "Image size unknown";
        }

        return { width: data.width, height: data.height } as ImageSize;
    })
    .then((imageSize) => {
        let size: number;
        let chunks: number;
        let gap: number;
        if (options.size) {
            gap = Math.round(options.size / options.ratio);
            size = options.size;
            chunks = getChunks(imageSize.width, gap, options.size);
        } else {
            chunks = options.chunks || 20;
            gap = Math.round(
                imageSize.width / ((options.ratio + 1) * chunks) + 1
            );
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
            blankImage(newImageWidth, newImageHeight)
                .composite(overlays)
                .png()
                .toFile("diced.png");
        });
    });
