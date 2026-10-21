const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

export type LoginResponse = {
  token: string;
  expiresAt: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: username, password }),
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.");
  }

  if (response.status === 401) {
    throw new ApiError("Usuário ou senha inválidos.", 401);
  }
  if (!response.ok) {
    throw new ApiError("Erro ao entrar. Tente novamente.", response.status);
  }
  return response.json();
}
