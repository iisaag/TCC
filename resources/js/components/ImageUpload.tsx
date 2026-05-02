import type { ChangeEvent } from "react";
import { useId, useState } from "react";

interface ImageUploadProps {
    label?: string;
    value?: string | null;
    accept?: string;
    onChange: (value: string | null) => void;
}

function getDisplaySource(value?: string | null): string | undefined {
    if (!value) {
        return undefined;
    }

    if (value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://")) {
        return value;
    }

    return undefined;
}

export default function ImageUpload({
    label = "Foto de perfil",
    value,
    accept = "image/*",
    onChange,
}: ImageUploadProps) {
    const inputId = useId();
    const [error, setError] = useState<string | null>(null);
    const preview = getDisplaySource(value);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            onChange(null);
            setError(null);

            return;
        }

        if (!file.type.startsWith("image/")) {
            setError("Selecione uma imagem válida.");
            onChange(null);
            event.target.value = "";

            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError("A imagem precisa ter no máximo 2 MB.");
            onChange(null);
            event.target.value = "";

            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;

            if (typeof result === "string") {
                onChange(result);
                setError(null);
            } else {
                setError("Não foi possível ler a imagem.");
                onChange(null);
            }
        };

        reader.onerror = () => {
            setError("Não foi possível ler a imagem.");
            onChange(null);
        };

        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-2">
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
                {label}
            </label>

            <div className="flex items-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white p-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                    {preview ? (
                        <img src={preview} alt={label} className="h-full w-full object-cover" />
                    ) : (
                        <span>Sem foto</span>
                    )}
                </div>

                <div className="flex-1 space-y-2">
                    <input
                        id={inputId}
                        type="file"
                        accept={accept}
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800"
                    />

                    <p className="text-xs text-gray-500">
                        A imagem será convertida para base64 e salva diretamente no banco.
                    </p>

                    {error && <p className="text-xs font-medium text-red-600">{error}</p>}
                </div>
            </div>
        </div>
    );
}
