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

image
    .metadata()
    .then((data) => {
        if (!data.width || !data.height) {
            throw "Image size unknown";
        }

        return { width: data.width, height: data.height } as ImageSize;
    })
    .then((imageSize) => {
        // console.log(imageSize);

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

        let done = false;
        let ix = 0;
        let iy = 0;
        let left = gap;
        let top = gap;

        const promises: Promise<OverlayOptions>[] = [];

        while (!done) {
            // console.log(left, top, ix, iy);

            const iix = ix;
            const iiy = iy;
            const ileft = left;
            const itop = top;
            promises.push(
                image
                    .extract({
                        left: ileft,
                        top: itop,
                        width: size,
                        height: size,
                    })
                    .toBuffer()
                    .then((input) => {
                        return {
                            input,
                            left: iix * size,
                            top: iiy * size,
                        };
                    })
            );

            ix++;
            left += gap + size;
            if (left + size > imageSize.width) {
                ix = 0;
                left = gap;
                iy++;
                top += gap + size;
                if (top + size > imageSize.height) {
                    done = true;
                }
            }
        }

        // console.log(newImageWidth, newImageHeight);
        Promise.all(promises).then((overlays) => {
            // console.log(overlays);
            sharp({
                create: {
                    width: newImageWidth,
                    height: newImageHeight,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                },
            })
                .composite(overlays)
                .png()
                .toFile("diced.png");
        });
    });
