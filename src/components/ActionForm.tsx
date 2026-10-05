"use client";

import { createContext, startTransition, useActionState, useContext, useRef } from "react";
import type { FormState } from "@/app/actions/types";
import { FormMessage } from "./FormMessage";

const PendingContext = createContext(false);

export function useActionFormPending() {
  return useContext(PendingContext);
}

type Props = Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  /** Clear the fields after a successful submit (e.g. chat messages). */
  resetOnSuccess?: boolean;
};

/**
 * Form wired to a server action that keeps what the user typed when the action returns an error.
 * (A plain `<form action>` makes React 19 reset every field once the action finishes.)
 */
export function ActionForm({ action, resetOnSuccess, children, ...props }: Props) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(async (prev: FormState, data: FormData) => {
    const result = await action(prev, data);
    if (resetOnSuccess && !result?.error) ref.current?.reset();
    return result;
  }, undefined);

  return (
    <form
      {...props}
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        const data = new FormData(e.currentTarget, submitter);
        startTransition(() => dispatch(data));
      }}
    >
      <PendingContext.Provider value={pending}>
        <FormMessage state={state} />
        {children}
      </PendingContext.Provider>
    </form>
  );
}
