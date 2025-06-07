import { useQuery } from '@tanstack/react-query';
import { getAllDayTemplates, getDayTemplateById } from 'services/dayTemplateService';

export const useTemplates = () => {
  return useQuery({
    queryKey: ['templates'],
    queryFn: getAllDayTemplates,
  });
};

export const useTemplateById = (templateId: string | undefined) => {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: () => getDayTemplateById(templateId!),
    enabled: !!templateId,
  });
};
