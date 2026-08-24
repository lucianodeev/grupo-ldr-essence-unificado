import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  clientAgenda,
  clientContractCatalog,
  clientApproveDelivery,
  clientDeliveries,
  clientMentorship,
  clientOrderDetail,
  clientOverview,
  clientRequestAdjustment,
  clientRequestAppointment,
  clientRescheduleAppointment,
  clientUpdateProfile,
  getClientContext,
} from "@/lib/client-portal.functions";

export function useClientContext() {
  const fn = useServerFn(getClientContext);
  return useQuery({
    queryKey: ["client-context"],
    queryFn: () => fn({}),
    staleTime: 60_000,
    retry: false,
  });
}

export function useClientContractCatalog() {
  const fn = useServerFn(clientContractCatalog);
  return useQuery({ queryKey: ["client-contract-catalog"], queryFn: () => fn({}), retry: false });
}

export function useClientOverview() {
  const fn = useServerFn(clientOverview);
  return useQuery({ queryKey: ["client-overview"], queryFn: () => fn({}), retry: false });
}

export function useClientMentorship() {
  const fn = useServerFn(clientMentorship);
  return useQuery({ queryKey: ["client-mentorship"], queryFn: () => fn({}), retry: false });
}

export function useClientDeliveries() {
  const fn = useServerFn(clientDeliveries);
  return useQuery({ queryKey: ["client-deliveries"], queryFn: () => fn({}), retry: false });
}

export function useClientOrder(orderId: string) {
  const fn = useServerFn(clientOrderDetail);
  return useQuery({
    queryKey: ["client-order", orderId],
    queryFn: () => fn({ data: { orderId } }),
    retry: false,
  });
}

function useInvalidateClient() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["client-overview"] });
    queryClient.invalidateQueries({ queryKey: ["client-deliveries"] });
    queryClient.invalidateQueries({ queryKey: ["client-order"] });
    queryClient.invalidateQueries({ queryKey: ["client-mentorship"] });
  };
}

export function useDeliveryReview() {
  const approveFn = useServerFn(clientApproveDelivery);
  const adjustFn = useServerFn(clientRequestAdjustment);
  const invalidate = useInvalidateClient();

  const approve = useMutation({
    mutationFn: (deliveryId: string) => approveFn({ data: { deliveryId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Entrega aprovada. Obrigado!");
    },
    onError: () => toast.error("Não foi possível aprovar esta entrega."),
  });

  const requestAdjustment = useMutation({
    mutationFn: (input: { deliveryId: string; comment: string }) => adjustFn({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Solicitação enviada à equipe.");
    },
    onError: () => toast.error("Não foi possível enviar sua solicitação."),
  });

  return { approve, requestAdjustment };
}

export function useUpdateClientProfile() {
  const fn = useServerFn(clientUpdateProfile);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fullName: string; phone: string | null }) => fn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-context"] });
      queryClient.invalidateQueries({ queryKey: ["client-overview"] });
      toast.success("Dados atualizados.");
    },
    onError: () => toast.error("Não foi possível salvar seus dados."),
  });
}

export function useClientAgenda() {
  const fn = useServerFn(clientAgenda);
  return useQuery({
    queryKey: ["client-agenda"],
    queryFn: () => fn({}),
  });
}

export function useAgendaActions() {
  const requestFn = useServerFn(clientRequestAppointment);
  const rescheduleFn = useServerFn(clientRescheduleAppointment);
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["client-agenda"] });
    queryClient.invalidateQueries({ queryKey: ["client-overview"] });
  };

  const request = useMutation({
    mutationFn: (input: { orderId: string; startsAt: string; note: string | null }) =>
      requestFn({ data: input }),
    onSuccess: invalidate,
  });

  const reschedule = useMutation({
    mutationFn: (input: { appointmentId: string; startsAt: string; note: string | null }) =>
      rescheduleFn({ data: input }),
    onSuccess: invalidate,
  });

  return { request, reschedule };
}
