import { Area } from 'react-easy-crop';

/**
 * Loads an image safely on both web and Android WebView.
 * We fetch the image as a blob first so the canvas never sees a
 * cross-origin URL — this avoids the "canvas tainted" security error on
 * Android WebView where Supabase CDN images don't send CORS headers.
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise(async (resolve, reject) => {
        try {
            // For blob/data URLs skip the fetch step — they're already local
            let objectUrl = url;
            if (!url.startsWith('blob:') && !url.startsWith('data:')) {
                const response = await fetch(url, { mode: 'cors' });
                if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
                const blob = await response.blob();
                objectUrl = URL.createObjectURL(blob);
            }
            const image = new Image();
            image.addEventListener('load', () => {
                if (objectUrl !== url) URL.revokeObjectURL(objectUrl);
                resolve(image);
            });
            image.addEventListener('error', reject);
            image.src = objectUrl;
        } catch (err) {
            // Fallback: try loading directly (works on web even if CORS-tainted)
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', reject);
            image.src = url;
        }
    });

export function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
    const rotRad = getRadianAngle(rotation);

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

/**
 * This function was adapted from the one in the ReadMe of https://github.com/DominicTobias/react-image-crop
 */
export default async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0,
    flip = { horizontal: false, vertical: false }
): Promise<string | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    const rotRad = getRadianAngle(rotation);

    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    // set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    // draw rotated image
    ctx.drawImage(image, 0, 0);

    // croppedAreaPixels values are bounding box relative
    // extract the cropped image using these values
    const data = ctx.getImageData(
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height
    );

    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // paste generated rotate image at the top left corner
    ctx.putImageData(data, 0, 0);

    // As Base64 string
    // return canvas.toDataURL('image/jpeg');

    // As Blob
    return new Promise((resolve, reject) => {
        canvas.toBlob((file) => {
            if (file) resolve(URL.createObjectURL(file));
            else reject(null);
        }, 'image/jpeg');
    });
}
