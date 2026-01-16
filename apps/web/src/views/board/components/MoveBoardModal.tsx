import { t } from "@lingui/core/macro";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const schema = z.object({
  targetWorkspacePublicId: z.string().min(1, t`Please select a workspace`),
});

type FormData = z.infer<typeof schema>;

export const MoveBoardModal = ({
  boardPublicId,
  currentWorkspacePublicId,
}: {
  boardPublicId: string;
  currentWorkspacePublicId: string;
}) => {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const router = useRouter();
  const utils = api.useUtils();

  const { data: workspaces } = api.workspace.all.useQuery();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const updateBoard = api.board.update.useMutation({
    onSuccess: (_, variables) => {
      const targetWorkspace = workspaces?.find(
        (w) => w.workspace.publicId === variables.workspacePublicId,
      );

      showPopup({
        header: t`Success`,
        message: t`Board moved successfully`,
        icon: "success",
      });
      closeModal();

      if (targetWorkspace) {
        router.push(`/${targetWorkspace.workspace.slug}`);
      }
    },
    onError: (error) => {
      showPopup({
        header: t`Error`,
        message: error.message || t`Failed to move board`,
        icon: "error",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateBoard.mutate({
      boardPublicId,
      workspacePublicId: data.targetWorkspacePublicId,
    });
  };

  const availableWorkspaces = workspaces
    ?.map((w) => w.workspace)
    .filter(
      (w) =>
        w.publicId !== currentWorkspacePublicId &&
        w.name &&
        w.name.trim().length > 0,
    );

  return (
    <div className="flex flex-col space-y-4 p-4">
      <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
        {t`Move board to another workspace`}
      </h2>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {t`Select the workspace you want to move this board to. You must be a member of the target workspace.`}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="targetWorkspacePublicId"
            className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
          >
            {t`Target Workspace`}
          </label>
          <select
            id="targetWorkspacePublicId"
            {...register("targetWorkspacePublicId")}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">{t`Select a workspace`}</option>
            {availableWorkspaces?.map((workspace) => (
              <option key={workspace.publicId} value={workspace.publicId}>
                {workspace.name}
              </option>
            ))}
          </select>
          {errors.targetWorkspacePublicId && (
            <span className="text-xs text-red-500">
              {errors.targetWorkspacePublicId.message}
            </span>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="secondary" onClick={closeModal} type="button">
            {t`Cancel`}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {t`Move`}
          </Button>
        </div>
      </form>
    </div>
  );
};
