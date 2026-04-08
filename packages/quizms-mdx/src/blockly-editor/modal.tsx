import { useCallback, useEffect, useRef, useState } from "react";

import { Form, Modal, SubmitButton, TextField } from "@olinfo/react-components";
import { dialog } from "blockly/core";

export function BlocklyModal() {
  const ref = useRef<HTMLDialogElement>(null);

  const [id, setId] = useState(0);
  const [message, setMessage] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [callback, setCallback] = useState<(result: string | null) => void>();

  useEffect(() => {
    dialog.setPrompt((message, defaultValue, callback) => {
      ref.current?.showModal();
      setId((id) => id + 1);
      setMessage(message);
      setDefaultValue(defaultValue);
      setCallback(() => callback);
    });
    return () => dialog.setPrompt(undefined);
  }, []);

  const submit = useCallback(
    ({ value }: { value: string }) => {
      callback?.(value);
      ref.current?.close();
    },
    [callback],
  );

  return (
    <Modal ref={ref} title="" className="max-w-sm">
      <Form key={id} defaultValue={{ value: defaultValue }} onSubmit={submit}>
        <TextField field="value" label={message} placeholder="" autoFocus={ref.current?.open} />
        <div className="flex flex-wrap justify-center gap-2">
          <SubmitButton className="btn-primary">Conferma</SubmitButton>
        </div>
      </Form>
    </Modal>
  );
}
