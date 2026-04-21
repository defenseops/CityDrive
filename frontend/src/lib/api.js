const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const authAPI = {
  register: (data) => request('POST', '/auth/register', data),
  login: (phone, password) => request('POST', '/auth/login', { phone, password }),
  employeeLogin: (email, password) => request('POST', '/auth/employee/login', { email, password }),
  me: () => request('GET', '/auth/me'),
};

export const usersAPI = {
  getMyDocuments: () => request('GET', '/users/me/documents'),
  uploadDocument: async (formData) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/users/me/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },
  getPendingVerification: () => request('GET', '/users/pending-verification'),
  verifyUser: (id, action, reason) => request('POST', `/users/${id}/verify`, { action, reason }),
  getUsers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/users${q ? '?' + q : ''}`);
  },
};

export const carsAPI = {
  getCars: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/cars${q ? '?' + q : ''}`);
  },
  getCar: (id) => request('GET', `/cars/${id}`),
  updateCar: (id, data) => request('PUT', `/cars/${id}`, data),
};

export const bookingsAPI = {
  createBooking: (data) => request('POST', '/bookings', data),
  getBookings: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/bookings${q ? '?' + q : ''}`);
  },
  getMyBookings: () => request('GET', '/bookings/my'),
  getMyReceipts: () => request('GET', '/bookings/receipts'),
  getBookingFiscal: (id) => request('GET', `/bookings/${id}/fiscal`),
  getBookingPrintReceipt: (id) => request('GET', `/bookings/${id}/print-receipt`),
  getBooking: (id) => request('GET', `/bookings/${id}`),
  activateBooking: (id) => request('POST', `/bookings/${id}/activate`),
  cancelBooking: (id) => request('POST', `/bookings/${id}/cancel`),
  completeBooking: (id, end_odometer) => request('POST', `/bookings/${id}/complete`, { end_odometer }),
  requestReturn: (id) => request('POST', `/bookings/${id}/request-return`),
  payDeposit: (id) => request('POST', `/bookings/${id}/pay-deposit`),
};

export const finesAPI = {
  getFines: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/fines${q ? '?' + q : ''}`);
  },
  getMyFines: () => request('GET', '/fines/my'),
  assignFine: (data) => request('POST', '/fines', data),
  payFine: (id) => request('POST', `/fines/${id}/pay`),
  getFineFiscal: (id) => request('GET', `/fines/${id}/fiscal`),
};

export const adminAPI = {
  getStats: () => request('GET', '/admin/stats'),
  getRevenue: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/admin/revenue${q ? '?' + q : ''}`);
  },
  getAudit: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/admin/audit${q ? '?' + q : ''}`);
  },
  getReceipts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/admin/receipts${q ? '?' + q : ''}`);
  },
};

export const employeesAPI = {
  getEmployees: () => request('GET', '/employees'),
  createEmployee: (data) => request('POST', '/employees', data),
  updateEmployee: (id, data) => request('PUT', `/employees/${id}`, data),
};

export const tariffsAPI = {
  getTariffs: () => request('GET', '/tariffs'),
  createTariff: (data) => request('POST', '/tariffs', data),
  updateTariff: (id, data) => request('PUT', `/tariffs/${id}`, data),
  deleteTariff: (id) => request('DELETE', `/tariffs/${id}`),
};

export const balanceAPI = {
  getBalance: () => request('GET', '/users/me/balance'),
  topup: (amount) => request('POST', '/users/me/topup', { amount }),
  getNotifications: () => request('GET', '/users/me/notifications'),
};

export const driverAPI = {
  getCars: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/driver/cars${q ? '?' + q : ''}`);
  },
  getDeliveries: () => request('GET', '/driver/deliveries'),
  acceptDelivery: (id, inspection) => request('POST', `/driver/deliveries/${id}/accept`, inspection),
  declineDelivery: (id) => request('POST', `/driver/deliveries/${id}/decline`),
  getMyTasks: () => request('GET', '/driver/my-tasks'),
  completeTask: (id, inspection) => request('POST', `/driver/tasks/${id}/complete`, inspection),
  getPickups: () => request('GET', '/driver/pickups'),
  acceptPickup: (id) => request('POST', `/driver/pickups/${id}/accept`),
  arrivedAtParking: (id) => request('POST', `/driver/pickups/${id}/arrived`),
  getParkingQueue: () => request('GET', '/driver/parking-queue'),
  completeParkingInspection: (id, inspection) => request('POST', `/driver/parking/${id}/inspect`, inspection),
};
