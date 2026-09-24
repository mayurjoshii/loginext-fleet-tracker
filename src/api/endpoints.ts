export const endpoints = {
  vehicles: {
    list: '/vehicles',
    detail: (id: string) => `/vehicles/${id}`,
    location: (id: string) => `/vehicles/${id}/location`,
  },
  fleets: {
    list: '/fleets',
    detail: (id: string) => `/fleets/${id}`,
  },
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
  },
};
