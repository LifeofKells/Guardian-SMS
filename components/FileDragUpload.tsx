
import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image as ImageIcon, Trash2 } from 'lucide-react';
import { cn } from './ui';
import { Button } from './ui';

interface FileDragUploadProps {
    onFilesSelected: (files: File[]) => void;
    maxFiles?: number;
    accept?: string;
    className?: string;
    title?: string;
    description?: string;
    existingFiles?: string[]; // URLs of existing files
    onRemoveExisting?: (url: string) => void;
}

export function FileDragUpload({
    onFilesSelected,
    maxFiles = 1,
    accept = "image/*",
    className,
    title = "Upload Files",
    description = "Drag & drop files here, or click to select",
    existingFiles = [],
    onRemoveExisting
}: FileDragUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [previews, setPreviews] = useState<{ file: File; previewUrl: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const processFiles = useCallback((files: FileList | File[]) => {
        const newFiles: File[] = [];
        const newPreviews: { file: File; previewUrl: string }[] = [];

        Array.from(files).forEach(file => {
            // Check file type
            if (accept && accept !== '*' && !file.type.match(accept.replace('*', '.*'))) {
                return; // Skip invalid types
            }

            newFiles.push(file);

            // Create preview for images
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                newPreviews.push({ file, previewUrl: url });
            } else {
                newPreviews.push({ file, previewUrl: '' });
            }
        });

        // Enforce max files
        const totalFiles = previews.length + newFiles.length;
        if (totalFiles > maxFiles) {
            // Truncate
            const allowedNew = maxFiles - previews.length;
            if (allowedNew > 0) {
                newFiles.splice(allowedNew);
                newPreviews.splice(allowedNew);
            } else {
                return; // No more files allowed
            }
        }

        setPreviews(prev => [...prev, ...newPreviews]);
        onFilesSelected(newFiles);
    }, [accept, maxFiles, onFilesSelected, previews.length]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    }, [processFiles]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
        // Reset inputs so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (index: number) => {
        setPreviews(prev => {
            const newPreviews = [...prev];
            // Revoke object URL to avoid memory leaks
            if (newPreviews[index].previewUrl) {
                URL.revokeObjectURL(newPreviews[index].previewUrl);
            }
            newPreviews.splice(index, 1);
            return newPreviews;
        });


    };

    return (
        <div className={cn("w-full space-y-4", className)}>
            <div
                className={cn(
                    "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer flex flex-col items-center justify-center text-center",
                    isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/25",
                    "min-h-[150px]"
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple={maxFiles > 1}
                    accept={accept}
                    className="hidden"
                    onChange={handleFileInputChange}
                />

                <div className="p-3 bg-muted rounded-full mb-3">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{description}</p>
                <p className="text-xs text-muted-foreground/50 mt-2">Max size 5MB • {accept.replace('image/', '')}</p>
            </div>

            {/* Existing Files (e.g. from server) */}
            {(existingFiles.length > 0 || previews.length > 0) && (
                <div className="grid grid-cols-3 gap-4">
                    {existingFiles.map((url, i) => (
                        <div key={`existing-${i}`} className="relative group aspect-square rounded-md overflow-hidden border border-border bg-muted">
                            <img src={url} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onRemoveExisting?.(url);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    {previews.map((preview, i) => (
                        <div key={`preview-${i}`} className="relative group aspect-square rounded-md overflow-hidden border border-border bg-muted">
                            {preview.previewUrl ? (
                                <img src={preview.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <File className="h-8 w-8 mb-2" />
                                    <span className="text-xs text-center px-1 truncate w-full">{preview.file.name}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const newPreviews = [...previews];
                                        URL.revokeObjectURL(newPreviews[i].previewUrl);
                                        newPreviews.splice(i, 1);
                                        setPreviews(newPreviews);
                                        // We need to notify parent of the removal too if we want them to stay in sync
                                        // But for now let's assume parent only cares about *new* files added via onFilesSelected
                                        // If we want full sync, we should change the prop interface.
                                        // Let's assume onFilesSelected is actually onFilesChanged
                                        const files = newPreviews.map(p => p.file);
                                        onFilesSelected(files);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
