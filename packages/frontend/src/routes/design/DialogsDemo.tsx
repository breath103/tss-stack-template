import { Button } from "@ui/components/Button";
import { TextField } from "@ui/components/FormFields";
import { LabeledField } from "@ui/components/LabeledField";
import { ModalForm } from "@ui/components/ModalForm";
import { useModal } from "@ui/components/modal-state";
import { Selector } from "@ui/components/Selector";
import { useI18n } from "@ui/i18n/I18nContext";
import { Controller, useForm, useWatch } from "react-hook-form";
import dict from "./DialogsDemo.i18n.json";
import { SectionTitle } from "./SectionTitle";

export function DialogsDemo() {
  const i18n = useI18n(dict);
  const { confirm, openModal, outlet } = useModal();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border bg-surface-1 p-6">
        <SectionTitle className="mb-2">{i18n.confirmCardTitle}</SectionTitle>
        <p className="mb-4 text-text-2">{i18n.confirmCardDescription}</p>
        <Button
          size="m"
          variant="destructive"
          onClick={() => {
            void confirm({
              title: i18n.confirmTitle,
              description: i18n.confirmDescription,
              confirmText: i18n.delete,
              variant: "destructive",
            });
          }}
          text={i18n.openDestructiveConfirm}
        />
      </div>

      <div className="rounded-lg border bg-surface-1 p-6">
        <SectionTitle className="mb-2">{i18n.customCardTitle}</SectionTitle>
        <p className="mb-4 text-text-2">
          {i18n.customCardDescriptionPrefix} <code className="font-mono text-sm">openModal</code>{" "}
          {i18n.customCardDescriptionSuffix} <code className="font-mono text-sm">{"{ onClose }"}</code>.
        </p>
        <Button
          size="m"
          variant="accent1"
          onClick={() => openModal(WaypointEditModal, { initial: "Tycho-1" })}
          text={i18n.openWaypointEditor}
        />
      </div>
      {outlet}
    </div>
  );
}

function WaypointEditModal({ initial, onClose }: { initial: string; onClose: () => void }) {
  const i18n = useI18n(dict);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ name: string; priority: "low" | "med" | "high" }>({
    defaultValues: { name: initial, priority: "med" },
  });
  // Demonstrates ModalForm's submitDisabled: clearing the callsign disables Save.
  const name = useWatch({ control, name: "name" });

  return (
    <ModalForm
      title={i18n.editWaypoint}
      onClose={onClose}
      onSubmit={e => void handleSubmit(() => onClose())(e)}
      presentation="narrow"
      cancelLabel={i18n.cancel}
      submitLabel={i18n.save}
      isSubmitting={isSubmitting}
      submitDisabled={!name.trim()}
    >
      <TextField control={control} name="name" label={i18n.callsign} rules={{ required: true }} required />
      <LabeledField label={i18n.priority}>
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <Selector
              value={field.value}
              onChange={field.onChange}
              options={["low", "med", "high"]}
              label={v => ({
                text: { low: i18n.priorityLow, med: i18n.priorityMedium, high: i18n.priorityHigh }[v],
              })}
            />
          )}
        />
      </LabeledField>
    </ModalForm>
  );
}
