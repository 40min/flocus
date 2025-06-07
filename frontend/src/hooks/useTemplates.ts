import { useQuery } from '@tanstack/react-query';
import { getAllDayTemplates } from 'services/dayTemplateService';

export const useTemplates = () => {
  return useQuery({
    queryKey: ['templates'],
    queryFn: getAllDayTemplates,
  });
};
