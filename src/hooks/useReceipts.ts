import { useMutation, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ReceiptData } from "@/components/print/ReceiptPrint";
import { useOrganization } from "@/contexts/OrganizationContext";

export function useSaveReceipt() {
  const supabase = createClient();
  const { org } = useOrganization();

  return useMutation({
    mutationFn: async ({
      data,
      ticketId,
      saleId,
      customerId,
    }: {
      data: ReceiptData;
      ticketId?: string;
      saleId?: string;
      customerId?: string;
    }) => {
      if (!org?.id) throw new Error("No organization selected");

      const { data: result, error } = await supabase
        .from("receipts")
        .insert({
          organization_id: org.id,
          doc_type:        data.docType,
          doc_number:      data.docNumber,
          total:           data.total,
          customer_id:     customerId || null,
          ticket_id:       ticketId || null,
          sale_id:         saleId || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          receipt_data:    data as any,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
  });
}

export function useReceipts() {
  const supabase = createClient();
  const { org } = useOrganization();

  return useQuery({
    queryKey: ["receipts", org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      const { data, error } = await supabase
        .from("receipts")
        .select("*, customer:customers(full_name, phone, document_id)")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!org?.id,
  });
}

export function useReceiptBySale(saleId: string | null | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["receipt-by-sale", saleId],
    queryFn: async () => {
      if (!saleId) return null;
      const { data } = await supabase
        .from("receipts")
        .select("*")
        .eq("sale_id", saleId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!saleId,
  });
}

export function useReceiptByTicket(ticketId: string | null | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["receipt-by-ticket", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data } = await supabase
        .from("receipts")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!ticketId,
  });
}
