"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  faPlus, faPenToSquare, faTrash, faUsers, faPhone, faEnvelope,
  faIdCard, faSearch, faUserPlus, faUserTag,
} from "@fortawesome/free-solid-svg-icons";
import { FaIcon } from "@/components/ui-custom/FaIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, type DataColumn } from "@/components/ui-custom/DataTable";
import {
  useClientes,
  useCreateCliente,
  useUpdateCliente,
  useDeleteCliente,
} from "@/hooks/useClientes";
import { useOrganization } from "@/contexts/OrganizationContext";

interface Customer {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  document_id: string | null;
  customer_type: string;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  notes: string | null;
  created_at: string;
  organization_id: string;
}

const schema = z.object({
  first_name: z.string().min(2, "Mínimo 2 caracteres"),
  last_name: z.string().min(2, "Mínimo 2 caracteres"),
  document_id: z.string().optional(),
  customer_type: z.string(),
  phone: z.string().optional(),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  tax_id: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function ClientesPage() {
  const { data: clientes = [], isLoading } = useClientes();
  const { org, taxIdName } = useOrganization();
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();
  const deleteMutation = useDeleteCliente();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      document_id: "",
      customer_type: "nuevo",
      phone: "",
      email: "",
      tax_id: "",
      notes: "",
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({
      first_name: "",
      last_name: "",
      document_id: "",
      customer_type: "nuevo",
      phone: "",
      email: "",
      tax_id: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    reset({
      first_name: c.first_name ?? c.full_name.split(" ")[0] ?? "",
      last_name: c.last_name ?? c.full_name.split(" ").slice(1).join(" ") ?? "",
      document_id: c.document_id ?? "",
      customer_type: c.customer_type ?? "nuevo",
      phone: c.phone ?? "",
      email: c.email ?? "",
      tax_id: c.tax_id ?? "",
      notes: c.notes ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const normalized = {
      full_name: `${values.first_name} ${values.last_name}`.trim(),
      first_name: values.first_name,
      last_name: values.last_name,
      document_id: values.document_id || null,
      customer_type: values.customer_type,
      phone:     values.phone     || null,
      email:     values.email     || null,
      tax_id:    values.tax_id    || null,
      notes:     values.notes     || null,
    };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...normalized });
    } else {
      await createMutation.mutateAsync({
        ...normalized,
        organization_id: org?.id ?? "",
      });
    }
    setDialogOpen(false);
    reset({});
  };


  const columns: DataColumn<Customer>[] = [
    {
      key: "full_name",
      header: "Cliente",
      primary: true,
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.full_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] bg-primary/10 text-primary/80 px-1.5 py-0.5 rounded-md capitalize">
              {row.customer_type || "nuevo"}
            </span>
            {row.document_id && (
              <span className="text-[10px] text-muted-foreground font-mono">
                DNI: {row.document_id}
              </span>
            )}
          </div>
          {row.email && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <FaIcon icon={faEnvelope} size={11} className="text-muted-foreground" /> {row.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Teléfono",
      cell: (row) =>
        row.phone ? (
          <span className="flex items-center gap-1 text-sm">
            <FaIcon icon={faPhone} size={13} className="text-muted-foreground" /> {row.phone}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "tax_id",
      header: taxIdName,
      showOnMobile: false,
      cell: (row) => (
        <span className="text-sm font-mono">
          {row.tax_id ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FaIcon icon={faUsers} size={18} /> Clientes
          </h1>
          <p className="text-sm text-muted-foreground">
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} registrado{clientes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <FaIcon icon={faPlus} size={14} /> Nuevo Cliente
        </Button>
      </div>

      {/* Table */}
      <DataTable
        data={clientes as Customer[]}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Buscar por nombre, teléfono, email..."
        searchKeys={["full_name", "phone", "email", "tax_id"]}
        emptyMessage="Aún no hay clientes registrados"
        emptyIcon={<FaIcon icon={faUsers} size={28} className="opacity-30" />}
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => openEdit(row)}
            >
              <FaIcon icon={faPenToSquare} size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteTarget(row)}
            >
              <FaIcon icon={faTrash} size={13} />
            </Button>
          </div>
        )}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombres *</Label>
                <Input placeholder="Carlos" {...register("first_name")} />
                {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Apellidos *</Label>
                <Input placeholder="Ramírez" {...register("last_name")} />
                {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>DNI / Documento</Label>
                <Input placeholder="12345678" {...register("document_id")} />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Cliente</Label>
                <Controller
                  name="customer_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nuevo">Nuevo</SelectItem>
                        <SelectItem value="recurrente">Recurrente</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input placeholder="+51 999 999 999" {...register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>{taxIdName}</Label>
                <Input placeholder="20506... / 12345678" {...register("tax_id")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Correo electrónico
                <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input type="email" placeholder="cliente@email.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input placeholder="Cliente frecuente, pagos en efectivo..." {...register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? "Guardar cambios" : "Crear cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Eliminarás a <strong>{deleteTarget?.full_name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
