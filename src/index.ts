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
        name: "ratiosg",
        alias: "r",
        type: Number,
        defaultValue: 1,
    },
    {
        name: "pixels",
        alias: "p",
        type: Number,
        defaultValue: 10,
    },
];
const options = cla(defs);

const image = sharp(options.image);

type ImageSize = { width: number; height: number };

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
        const gap = Math.round(
            imageSize.width / ((options.ratiosg + 1) * options.pixels) + 1
        );
        const size = Math.round(options.ratiosg * gap);

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
                        return { input, left: iix * size, top: iiy * size };
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

        const newImageWidth = options.pixels * size;
        const newImageHeight =
            Math.round((imageSize.height / gap - 1) / (1 + size / gap)) * size;

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
