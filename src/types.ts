export type ImageSize = { width: number; height: number };

export type OverlayOptions = {
    input: Buffer,
    left: number,
    top: number
}

export type ImageSection = {
    left: number,
    top: number,
    width: number,
    height: number
}

export interface CrowImageFactory {
    fromFile(filename: string): CrowImage;
    composite(width: number, height: number, overlays: OverlayOptions[]): CrowImage;
}

export interface CrowImage {
    extract(section: ImageSection, flop?: boolean): Promise<Buffer>;
    write(outputfile: string): Promise<void>;
    imageSize(): Promise<ImageSize>;
    rotate(angle: number): CrowImage;
}