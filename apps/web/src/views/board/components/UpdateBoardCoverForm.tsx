import { t } from "@lingui/core/macro";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const schema = z.object({
  file: z.any().optional(),
});

type FormData = z.infer<typeof schema>;

export const UpdateBoardCoverForm = ({
  boardPublicId,
  coverImage,
}: {
  boardPublicId: string;
  coverImage: string | null;
}) => {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(coverImage);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const updateBoard = api.board.update.useMutation({
    onSuccess: () => {
      utils.board.byId.invalidate({ boardPublicId });
      showPopup({
        header: t`Success`,
        message: t`Board cover updated successfully`,
        icon: "success",
      });
      closeModal();
    },
    onError: () => {
      showPopup({
        header: t`Error`,
        message: t`Failed to update board cover`,
        icon: "error",
      });
    },
  });

  const getUploadUrl = api.board.uploadCoverImage.useMutation();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showPopup({
          header: t`Error`,
          message: t`File size must be less than 5MB`,
          icon: "error",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File) => {
    const { url, key } = await getUploadUrl.mutateAsync({
      boardPublicId,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    });

    await fetch(url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    return key;
  };

  const onSubmit = async () => {
    try {
      let key = coverImage;

      if (selectedFile) {
        key = await uploadFile(selectedFile);
      } else if (previewUrl === null) {
        // If previewUrl is null and no file selected, it means cover was removed
        key = null;
      }

      await updateBoard.mutateAsync({
        boardPublicId,
        coverImage: key,
      });
    } catch (error) {
      console.error(error);
      showPopup({
        header: t`Error`,
        message: t`Failed to update board cover`,
        icon: "error",
      });
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-4">
      <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
        {t`Update board cover`}
      </h2>

      {previewUrl && (
        <div className="relative h-40 w-full overflow-hidden rounded-md">
           {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Board cover preview"
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setPreviewUrl(null);
            }}
            className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
          >
             Remove
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="cover-upload"
            className="cursor-pointer rounded-md bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            {previewUrl ? t`Change cover` : t`Upload cover`}
          </label>
          <input
            id="cover-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={closeModal} type="button">
            {t`Cancel`}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {t`Save`}
          </Button>
        </div>
      </form>
    </div>
  );
};
