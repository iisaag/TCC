export async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
                return;
            }

            reject(new Error("Falha ao converter arquivo em base64."));
        };

        reader.onerror = () => {
            reject(new Error("Falha ao ler arquivo."));
        };

        reader.readAsDataURL(file);
    });
}
