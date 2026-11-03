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

export type EquipmentStatus = "DISPONIVEL" | "EMPRESTADO" | "MANUTENCAO" | "DANIFICADO" | "INATIVO";

export type Equipment = {
  id: number;
  nome: string;
  codigo: string;
  fotoUrl: string | null;
  status: EquipmentStatus;
  categoria: string | null;
  laboratorio: string | null;
  qtdDisponivel: number;
  qtdTotal: number;
  cadastradoEm: string;
};

export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
};

export async function listEquipment(
  token: string,
  params: { status?: EquipmentStatus; search?: string; page?: number; size?: number } = {},
): Promise<Page<Equipment>> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 20));

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/equipment?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.");
  }

  if (response.status === 401) {
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }
  if (!response.ok) {
    throw new ApiError("Erro ao carregar equipamentos. Tente novamente.", response.status);
  }
  return response.json();
}
