import sharp, { Sharp } from "sharp";
import cla from "command-line-args";
import { SharpImage, SharpImageFactory } from "./SharpImage";
import { CrowImage, ImageSize, OverlayOptions } from "./types";
import { DicerUtils } from "./DicerUtils";

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

const factory = new SharpImageFactory();
const image = factory.fromFile(options.image);

switch (options.type) {
    case "dice":
        DicerUtils.dice(factory, image, options.size, options.ratio, options.chunks).then(image => {
            image.write(options.output);
        });
        break;
    case "test":
    case "testr":
        DicerUtils.test(factory, image, options.type, options.size, options.chunks).then(image => {
            image.write(options.output);
        })
        break;
}
