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

export type Loan = {
  loanId: number;
  equipmentName: string;
  quantity: number;
  studentName: string;
  studentRegistrationNumber: string;
  professorName: string;
  technicianName: string;
  checkoutDate: string;
  expectedReturnDate: string;
  loanStatus: string;
};

export async function listActiveLoans(token: string): Promise<Loan[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/loans`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.");
  }

  if (response.status === 401) {
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }
  if (!response.ok) {
    throw new ApiError("Erro ao carregar empréstimos. Tente novamente.", response.status);
  }
  return response.json();
}

export async function getEquipment(token: string, id: number): Promise<Equipment> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/equipment/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.");
  }

  if (response.status === 401) {
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }
  if (!response.ok) {
    throw new ApiError("Erro ao carregar o equipamento. Tente novamente.", response.status);
  }
  return response.json();
}

export type Professor = {
  id: number;
  name: string;
};

export async function listProfessors(token: string): Promise<Professor[]> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/professors`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.");
  }

  if (response.status === 401) {
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }
  if (!response.ok) {
    throw new ApiError("Erro ao carregar professores. Tente novamente.", response.status);
  }
  return response.json();
}

export type Student = {
  id: number;
  name: string;
  registrationNumber: string;
  email: string;
  phone: string | null;
  reliabilityRate: number | null;
  registrationDate: string;
};

/** Retorna null quando a matrícula não corresponde a nenhum aluno (não é um erro). */
export async function getStudentByRegistration(
  token: string,
  registration: string,
): Promise<Student | null> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/students/${encodeURIComponent(registration)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.");
  }

  if (response.status === 404) return null;
  if (response.status === 401) {
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }
  if (!response.ok) {
    throw new ApiError("Erro ao consultar aluno. Tente novamente.", response.status);
  }
  return response.json();
}

export type ActiveLoan = {
  loanId: number;
  checkoutDate: string;
  expectedReturnDate: string;
  extendedDate: string | null;
  loanStatus: string;
};

export async function getStudentActiveLoans(
  token: string,
  registration: string,
): Promise<ActiveLoan[]> {
  let response: Response;
  try {
    response = await fetch(
      `${API_URL}/api/students/${encodeURIComponent(registration)}/active-loans`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.");
  }

  if (response.status === 404) return [];
  if (response.status === 401) {
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }
  if (!response.ok) {
    throw new ApiError("Erro ao consultar pendências do aluno. Tente novamente.", response.status);
  }
  return response.json();
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.message === "string" && body.message) return body.message;
  } catch {
    // Corpo não é JSON; usa a mensagem padrão.
  }
  return fallback;
}

/** Faz upload de uma foto (URI local do expo-image-picker) e retorna a URL pública salva. */
export async function uploadPhoto(token: string, photoUri: string): Promise<string> {
  const form = new FormData();
  const filename = photoUri.split("/").pop() ?? "foto.jpg";
  const extension = filename.split(".").pop()?.toLowerCase();
  const mimeType = extension === "png" ? "image/png" : "image/jpeg";
  // @ts-expect-error RN aceita esse formato de arquivo em FormData, mas o tipo padrão do DOM não.
  form.append("foto", { uri: photoUri, name: filename, type: mimeType });

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/equipment/photos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.");
  }

  if (response.status === 401) {
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }
  if (!response.ok) {
    throw new ApiError(await extractErrorMessage(response, "Erro ao enviar a foto. Tente novamente."), response.status);
  }
  const data: { fotoUrl: string } = await response.json();
  return data.fotoUrl;
}

export type LoanItemRequest = {
  equipmentId: number;
  checkoutPhoto: string;
  checkoutCondition: string;
};

export type LoanRequest = {
  studentRegistrationNumber?: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  professorId: number;
  expectedReturnDate?: string;
  items: LoanItemRequest[];
};

export async function createLoan(token: string, request: LoanRequest): Promise<{ loanId: number }> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/loans`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        alunoMatricula: request.studentRegistrationNumber,
        alunoNome: request.studentName,
        alunoEmail: request.studentEmail,
        alunoTelefone: request.studentPhone,
        professorId: request.professorId,
        dataPrevistaDevolucao: request.expectedReturnDate,
        itens: request.items.map((item) => ({
          equipamentoId: item.equipmentId,
          fotoRetirada: item.checkoutPhoto,
          estadoRetirada: item.checkoutCondition,
        })),
      }),
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.");
  }

  if (response.status === 401) {
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }
  if (!response.ok) {
    throw new ApiError(
      await extractErrorMessage(response, "Erro ao registrar o empréstimo. Tente novamente."),
      response.status,
    );
  }
  return response.json();
}
