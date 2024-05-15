export const generateResponse = (
  message: string,
  data: any,
  pagination?: {
    offset: number;
    limit: number;
    total: number;
  },
) => {
  const response = {
    message,
    data,
  };

  if (pagination) {
    return {
      ...response,
      pagination: {
        ...pagination,
        hasNext: pagination.total > pagination.offset + pagination.limit,
      },
    };
  }

  return response;
};
