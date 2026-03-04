import sharp, { Sharp } from "sharp";
import { CrowImage, CrowImageFactory, ImageSection, ImageSize, OverlayOptions } from "./types";

export class SharpImage implements CrowImage {
    private image: Sharp;

    constructor(imagefile?: string, image?: Sharp) {
        if (image) {
            this.image = image;
        } else {
            this.image = sharp(imagefile);
        }
    }
    
    static fromSharp(image: Sharp) {
        return new SharpImage(undefined, image);
    }

    rotate(angle: number) {
        return SharpImage.fromSharp(this.image.rotate(angle));
    }

    imageSize() {
        return this.image
                   .metadata()
                   .then((data) => {
                        if (!data.width || !data.height) {
                            throw "Image size unknown";
                        }
                        return { width: data.width, height: data.height } as ImageSize;
                    });
    }
    
    write(outputfile: string) {
        return this.image.toFile(outputfile).then(() => undefined);
    }

    extract(section: ImageSection, flop = false): Promise<Buffer> {
        return this.image.extract(section).flop(flop)
                .toBuffer();
    }    
}

export class SharpImageFactory implements CrowImageFactory {
    private blank(width: number, height: number) {
        return sharp({
            create: {
                width,
                height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
        });
    }
    
    fromFile(filename: string) {
        return new SharpImage(filename);
    }

    composite(width: number, height: number, overlays: OverlayOptions[]): CrowImage {
        console.log(width, height);
        return SharpImage.fromSharp(this.blank(width, height).composite(overlays));
    }
}
