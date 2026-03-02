import { CrowImage, CrowImageFactory, ImageSize, OverlayOptions } from "./types";
    
function isOdd(num: number) {
    return num % 2 === 1;
}

export class DicerUtils {
    private constructor() {}

    static dice(factory: CrowImageFactory, image: CrowImage, _size: number, ratio: number, _chunks: number) {
        const getChunks = (imageSize: number, gap: number, size: number) => {
            return Math.floor((imageSize / gap - 1) / (1 + size / gap));
        };
    
        return image.imageSize().then((imageSize) => {
            let size: number;
            let chunks: number;
            let gap: number;
            if (_size) {
                gap = Math.floor(_size / ratio);
                size = _size;
                chunks = getChunks(imageSize.width, gap, _size);
            } else {
                chunks = _chunks || 20;
                gap = Math.floor(imageSize.width / ((ratio + 1) * chunks) + 1);
                size = Math.floor(ratio * gap);
            }
        
            const newImageWidth = chunks * size;
            const newImageHeight = getChunks(imageSize.height, gap, size) * size;
        
            const index2Pixels = (index: number) => {
                return gap + index * (gap + size);
            };
        
            let done = false;
            let ix = 0;
            let iy = 0;
        
            const promises: Promise<OverlayOptions>[] = [];
        
            while (!done) {
                //
                // NOTE: Need to save this outside the then because by the time
                // the then fires the ix's have changed.
                //
                const iix = ix;
                const iiy = iy;
                promises.push(
                        image.extract({left: index2Pixels(iix),
                            top: index2Pixels(iiy),
                            width: size,
                            height: size
                        })
                        .then((input) => {
                            return {
                                input,
                                left: iix * size,
                                top: iiy * size,
                            } as OverlayOptions;
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
        
            return Promise.all(promises).then((overlays) => {
                return factory.composite(newImageWidth, newImageHeight, overlays)
            });
        });
    };

    static test(factory: CrowImageFactory, image: CrowImage, type: string, _size: number, _chunks: number) {
        const testr = "testr" === type;

        const getChunks = (imageSize: number, size: number) => {
            return Math.floor(imageSize / size);
        };

        return image.imageSize().then((imageSize) => {
                let size: number;
                let chunks: number;
                if (_size) {
                    size = _size;
                    chunks = getChunks(imageSize.width, _size);
                } else {
                    size = Math.floor(imageSize.width / _chunks);
                    chunks = _chunks;
                }
                let ychunks = getChunks(imageSize.height, size);
                const newImageWidth = chunks * size;
                const newImageHeight = ychunks * size;

                const promises: Promise<OverlayOptions>[] = [];
                for (let ii = 0; ii < chunks; ii++) {
                    let left: number;
                    let im: CrowImage;
                    if (testr && isOdd(ii)) {
                        im = image.rotate(180);
                        left = newImageWidth - (ii * size + size);
                    } else {
                        im = image;
                        left = ii * size;
                    }
                    promises.push(
                        im.extract({
                                left,
                                top: 0,
                                width: size,
                                height: imageSize.height,
                            }, !testr && isOdd(ii))
                            .then((input) => {
                                return {
                                    input,
                                    left: ii * size,
                                    top: 0,
                                } as OverlayOptions;
                            })
                    );
                }

                return Promise.all(promises).then(async (overlays) => {
                    const _image = factory.composite(newImageWidth, newImageHeight,
                            overlays
                        );

                    const promises: Promise<OverlayOptions>[] = [];
                    for (let ii = 0; ii < ychunks; ii++) {
                        let top: number;
                        let im: CrowImage;
                        if (testr && isOdd(ii)) {
                            im = _image.rotate(180);
                            top = newImageHeight - (ii * size + size);
                        } else {
                            im = _image;
                            top = ii * size;
                        }
                        let extract = {
                            left: 0,
                            top,
                            width: newImageWidth,
                            height: size,
                        };
                        promises.push(
                            im.extract(extract, !testr && isOdd(ii))
                                .then((input) => {
                                    return {
                                        input,
                                        left: 0,
                                        top: ii * size,
                                    };
                                })
                        );
                    }

                    return Promise.all(promises).then((overlays) => {
                        return factory.composite(newImageWidth, newImageHeight, overlays)
                    });
                });
            });
    }
}