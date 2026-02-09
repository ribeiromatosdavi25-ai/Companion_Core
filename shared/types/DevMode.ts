export interface DevModeRequest {
  message: string;
  session_id?: string;
  dev_mode?: {
    token: string;
    allow_external: boolean;
  };
}

export const DEV_MODE_TOKEN = 'devmode2606';

export function isValidDevToken(token?: string): boolean {
  return token === DEV_MODE_TOKEN;
}
