/** Bootstrap contextual class suffix used by the Alert component. */
export type AlertType = "success" | "danger" | "warning" | "info";

export interface AlertState {
  message: string;
  type: AlertType | "";
}

export type ShowAlert = (message: string, type: AlertType) => void;
