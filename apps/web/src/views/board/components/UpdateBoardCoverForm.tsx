import { t } from "@lingui/core/macro";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const schema = z.object({
  file: z.any().optional(),
  url: z.string().url().optional().or(z.literal("")),
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
  const [activeTab, setActiveTab] = useState<"upload" | "link">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(coverImage);
  const [urlInput, setUrlInput] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
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

      if (activeTab === "upload") {
        if (selectedFile) {
          key = await uploadFile(selectedFile);
        } else if (previewUrl === null) {
          key = null;
        }
      } else {
        if (urlInput) {
          key = urlInput;
        } else if (previewUrl === null) {
            key = null;
        }
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
              setUrlInput("");
            }}
            className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
          >
            <span className="sr-only">{t`Remove`}</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "upload"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("upload")}
        >
          {t`Upload`}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "link"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("link")}
        >
          {t`Link`}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {activeTab === "upload" ? (
          <div>
            <label
              htmlFor="cover-upload"
              className="cursor-pointer flex justify-center w-full rounded-md border-2 border-dashed border-gray-300 px-4 py-6 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              {t`Click to upload image`}
            </label>
            <input
              id="cover-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              {t`Image URL`}
            </label>
            <Input
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setPreviewUrl(e.target.value || null);
              }}
              errorMessage={errors.url?.message}
            />
          </div>
        )}

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
