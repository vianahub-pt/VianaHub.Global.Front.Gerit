"use client";

import clsx from "clsx";
import { SquarePen, Trash2, UserRoundPlus, Power, Loader2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/platform/auth";
import { useTranslation } from "@/platform/i18n";
import { WorkspaceShell } from "@/shared/layout";
import { useToast } from "@/shared/feedback";
import {
  HubGrid,
  type HubGridColumn,
  type RowDensity,
} from "@/shared/hub-grid";

interface ClientItem {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  isActive: boolean;
}

interface ClientsPagedResponse {
  items?: unknown;
  data?: unknown;
  totalItems?: unknown;
  pageNumber?: number;
  pageSize?: number;
  totalPages?: number;
}

interface ClientFormState {
  name: string;
  email: string;
  phone: string;
}

interface ContactItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

interface ContactsPagedResponse {
  items?: unknown;
  totalItems?: unknown;
}

interface ContactFormState {
  name: string;
  email: string;
  phone: string;
}

interface AddressItem {
  id: number;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  isActive: boolean;
}

interface AddressesPagedResponse {
  items?: unknown;
  totalItems?: unknown;
}

interface AddressFormState {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const CONTACT_PAGE_SIZE = 25;
const ADDRESS_PAGE_SIZE = 25;
type BulkResource = "clients" | "client-contacts" | "client-addresses";
type ClientDetailMode = "hidden" | "create" | "edit";
type SortColumn = "Name" | "Email" | "Phone";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500, 1000] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];
type ClientStatusFilter = "active" | "inactive" | "all";
const initialClientFormState: ClientFormState = {
  name: "",
  email: "",
  phone: "",
};

const initialContactFormState: ContactFormState = {
  name: "",
  email: "",
  phone: "",
};

const initialAddressFormState: AddressFormState = {
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

function normalizeClient(payload: unknown): ClientItem | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const id = candidate.id;
  const name = candidate.name;
  const email = candidate.email;
  const phone = candidate.phone;
  const isActive = candidate.isActive;

  if (
    typeof id !== "number" ||
    typeof name !== "string" ||
    typeof phone !== "string" ||
    typeof isActive !== "boolean"
  ) {
    return null;
  }

  return {
    id,
    name,
    email: typeof email === "string" ? email : null,
    phone,
    isActive,
  };
}

function normalizeErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null) {
    return fallback;
  }

  const candidate = payload as {
    message?: unknown;
    error?: unknown;
    title?: unknown;
    errors?: unknown;
  };

  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message;
  }

  if (typeof candidate.error === "string" && candidate.error.trim()) {
    return candidate.error;
  }

  if (typeof candidate.title === "string" && candidate.title.trim()) {
    return candidate.title;
  }

  if (typeof candidate.errors === "object" && candidate.errors !== null) {
    const firstErrorGroup = Object.values(
      candidate.errors as Record<string, unknown>,
    ).find((value) => Array.isArray(value) && value.length > 0);

    if (
      Array.isArray(firstErrorGroup) &&
      typeof firstErrorGroup[0] === "string" &&
      firstErrorGroup[0].trim()
    ) {
      return firstErrorGroup[0];
    }
  }

  return fallback;
}

function parsePagedClients(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return { items: [] as ClientItem[], totalItems: 0 };
  }

  const candidate = payload as ClientsPagedResponse;
  const rawItems = Array.isArray(candidate.items)
    ? candidate.items
    : Array.isArray((candidate as { data?: unknown }).data)
      ? ((candidate as { data: unknown }).data as unknown[])
      : [];
  const items = rawItems
    .map(normalizeClient)
    .filter((item): item is ClientItem => item !== null);

  const totalItemsValue =
    typeof candidate.totalItems === "number"
      ? candidate.totalItems
      : Array.isArray((candidate as { data?: unknown }).data)
        ? ((candidate as { data: unknown }).data as unknown[]).length
        : items.length;

  return {
    items,
    totalItems: totalItemsValue,
  };
}

function normalizeContact(payload: unknown): ContactItem | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const rawId =
    typeof candidate.id === "number"
      ? candidate.id
      : typeof candidate.contactId === "number"
        ? candidate.contactId
        : null;

  if (rawId === null) {
    return null;
  }

  const name =
    typeof candidate.name === "string"
      ? candidate.name
      : typeof candidate.fullName === "string"
        ? candidate.fullName
        : typeof candidate.contactName === "string"
          ? candidate.contactName
          : "";

  const phone =
    typeof candidate.phone === "string"
      ? candidate.phone
      : typeof candidate.mobile === "string"
        ? candidate.mobile
        : null;

  const email = typeof candidate.email === "string" ? candidate.email : null;

  const isActiveValue =
    typeof candidate.isActive === "boolean"
      ? candidate.isActive
      : typeof candidate.active === "boolean"
        ? candidate.active
        : typeof candidate.enabled === "boolean"
          ? candidate.enabled
          : true;

  return {
    id: rawId,
    name,
    email,
    phone,
    isActive: Boolean(isActiveValue),
  };
}

function parsePagedContacts(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return { items: [] as ContactItem[], totalItems: 0 };
  }

  const candidate = payload as ContactsPagedResponse;
  const rawItems = Array.isArray(candidate.items) ? candidate.items : [];
  const items = rawItems
    .map(normalizeContact)
    .filter((item): item is ContactItem => item !== null);

  return {
    items,
    totalItems:
      typeof candidate.totalItems === "number"
        ? candidate.totalItems
        : items.length,
  };
}

function normalizeAddress(payload: unknown): AddressItem | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const rawId =
    typeof candidate.id === "number"
      ? candidate.id
      : typeof candidate.addressId === "number"
        ? candidate.addressId
        : null;

  if (rawId === null) {
    return null;
  }

  const street =
    typeof candidate.street === "string"
      ? candidate.street
      : typeof candidate.addressLine1 === "string"
        ? candidate.addressLine1
        : typeof candidate.address === "string"
          ? candidate.address
          : typeof candidate.line1 === "string"
            ? candidate.line1
            : null;

  const city =
    typeof candidate.city === "string"
      ? candidate.city
      : typeof candidate.town === "string"
        ? candidate.town
        : null;

  const state =
    typeof candidate.state === "string"
      ? candidate.state
      : typeof candidate.region === "string"
        ? candidate.region
        : null;

  const postalCode =
    typeof candidate.postalCode === "string"
      ? candidate.postalCode
      : typeof candidate.zipCode === "string"
        ? candidate.zipCode
        : null;

  const country =
    typeof candidate.country === "string"
      ? candidate.country
      : typeof candidate.regionCode === "string"
        ? candidate.regionCode
        : null;

  const isActiveValue =
    typeof candidate.isActive === "boolean"
      ? candidate.isActive
      : typeof candidate.active === "boolean"
        ? candidate.active
        : typeof candidate.enabled === "boolean"
          ? candidate.enabled
          : true;

  return {
    id: rawId,
    street,
    city,
    state,
    postalCode,
    country,
    isActive: Boolean(isActiveValue),
  };
}

function parsePagedAddresses(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return { items: [] as AddressItem[], totalItems: 0 };
  }

  const candidate = payload as AddressesPagedResponse;
  const rawItems = Array.isArray(candidate.items) ? candidate.items : [];
  const items = rawItems
    .map(normalizeAddress)
    .filter((item): item is AddressItem => item !== null);

  return {
    items,
    totalItems:
      typeof candidate.totalItems === "number"
        ? candidate.totalItems
        : items.length,
  };
}

export function ClientsPage() {
  const { fetchWithAuth, isHydrating, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ClientStatusFilter>("active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [rowDensity, setRowDensity] = useState<RowDensity>("medium");
  const [totalItems, setTotalItems] = useState(0);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [formState, setFormState] = useState<ClientFormState>(
    initialClientFormState,
  );
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactFormState, setContactFormState] = useState<ContactFormState>(
    initialContactFormState,
  );
  const [editingContact, setEditingContact] = useState<ContactItem | null>(
    null,
  );
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressFormState, setAddressFormState] = useState<AddressFormState>(
    initialAddressFormState,
  );
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(
    null,
  );
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [clientsBulkUploading, setClientsBulkUploading] = useState(false);
  const [contactsBulkUploading, setContactsBulkUploading] = useState(false);
  const [addressesBulkUploading, setAddressesBulkUploading] = useState(false);
  const [clientDetailMode, setClientDetailMode] =
    useState<ClientDetailMode>("hidden");
  const [sortBy, setSortBy] = useState<SortColumn>("Name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [totalPagesFromServer, setTotalPagesFromServer] = useState(1);

  const detailVisible = clientDetailMode !== "hidden";
  const clientColumns = useMemo<HubGridColumn<ClientItem>[]>(
    () => [
      {
        key: "Name",
        label: t("clients.table.name"),
        cellClassName: "text-[#3E515B] dark:text-[#84a0c0]",
      },
      {
        key: "Email",
        label: t("clients.table.email"),
        cellClassName: "text-[#3E515B] dark:text-[#84a0c0]",
      },
      {
        key: "Phone",
        label: t("clients.table.phone"),
        cellClassName: "text-[#3E515B] dark:text-[#84a0c0]",
      },
    ],
    [t],
  );
  const densityOptions = useMemo(
    () => [
      { key: "compact" as RowDensity, label: t("clients.grid.density.slow") },
      { key: "medium" as RowDensity, label: t("clients.grid.density.medium") },
      {
        key: "expanded" as RowDensity,
        label: t("clients.grid.density.expanded"),
      },
    ],
    [t],
  );

  const resetClientForm = useCallback(() => {
    setFormState(initialClientFormState);
  }, []);

  const resetContactForm = useCallback(() => {
    setEditingContact(null);
    setContactFormState(initialContactFormState);
  }, []);

  const resetAddressForm = useCallback(() => {
    setEditingAddress(null);
    setAddressFormState(initialAddressFormState);
  }, []);

  const resetDetailState = useCallback(() => {
    setSelectedClient(null);
    resetClientForm();
    resetContactForm();
    resetAddressForm();
    setContacts([]);
    setAddresses([]);
  }, [
    resetClientForm,
    resetContactForm,
    resetAddressForm,
    setContacts,
    setAddresses,
  ]);

  const hideClientDetail = useCallback(() => {
    resetDetailState();
    setClientDetailMode("hidden");
  }, [resetDetailState]);

  const showCreateClientForm = useCallback(() => {
    resetDetailState();
    setClientDetailMode("create");
  }, [resetDetailState]);

  const handleClientSelection = (client: ClientItem) => {
    setSelectedClient(client);
    setClientDetailMode("edit");
    setFormState({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone,
    });
    resetContactForm();
    resetAddressForm();
    setContacts([]);
    setAddresses([]);
  };

  const handleSort = useCallback(
    (column: SortColumn) => {
      setSortDirection((currentDirection) => {
        if (sortBy === column) {
          return currentDirection === "asc" ? "desc" : "asc";
        }

        return "asc";
      });
      setSortBy(column);
      setPage(1);
    },
    [sortBy],
  );

  const handlePageSizeChange = useCallback((value: PageSizeOption) => {
    setPageSize(value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: ClientStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const loadClients = useCallback(async () => {
    setLoading(true);

    const query = new URLSearchParams({
      Search: search.trim(),
      PageNumber: String(page),
      PageSize: String(pageSize),
      SortBy: sortBy,
      SortDirection: sortDirection,
    });
    if (statusFilter !== "all") {
      query.set("IsActive", statusFilter === "active" ? "true" : "false");
    }

    try {
      const response = await fetchWithAuth(
        `/api/gerit/v1/clients/paged?${query.toString()}`,
        {
          method: "GET",
        },
      );

      const payload = (await response.json().catch(() => null)) as unknown;
      const candidate = payload as ClientsPagedResponse;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(payload, t("clients.errors.load")),
        );
      }

      const parsed = parsePagedClients(payload);
      const serverPageNumber =
        typeof candidate.pageNumber === "number" ? candidate.pageNumber : page;
      const serverPageSize =
        typeof candidate.pageSize === "number" ? candidate.pageSize : pageSize;
      const serverTotalItems =
        typeof candidate.totalItems === "number"
          ? candidate.totalItems
          : parsed.totalItems;
      const serverTotalPages =
        typeof candidate.totalPages === "number"
          ? Math.max(1, candidate.totalPages)
          : Math.max(1, Math.ceil(serverTotalItems / serverPageSize));

      setClients(parsed.items);
      setTotalItems(serverTotalItems);
      setTotalPagesFromServer(serverTotalPages);
      setPage(serverPageNumber);
      setPageSize(serverPageSize);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("clients.errors.load");
      setClients([]);
      setTotalItems(0);
      toast({
        title: t("clients.toasts.errorTitle"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    fetchWithAuth,
    page,
    pageSize,
    search,
    statusFilter,
    sortBy,
    sortDirection,
    t,
    toast,
  ]);

  useEffect(() => {
    if (!isHydrating && isAuthenticated) {
      void loadClients();
    }
  }, [isAuthenticated, isHydrating, loadClients]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = formState.name.trim();
    const phone = formState.phone.trim();
    const email = formState.email.trim();

    if (!name || !phone) {
      toast({
        title: t("clients.toasts.validationTitle"),
        description: t("clients.validation.required"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name,
        email: email.length > 0 ? email : null,
        phone,
      };

      const isEditing = selectedClient !== null;
      const endpoint = isEditing
        ? `/api/gerit/v1/clients/${selectedClient?.id}`
        : "/api/gerit/v1/clients";
      const response = await fetchWithAuth(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response
        .json()
        .catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(responsePayload, t("clients.errors.save")),
        );
      }

      const normalized = normalizeClient(responsePayload);

      if (normalized) {
        setSelectedClient(normalized);
        setFormState({
          name: normalized.name,
          email: normalized.email ?? "",
          phone: normalized.phone,
        });
        setClientDetailMode("edit");
      }

      toast({
        title: t("clients.toasts.successTitle"),
        description: isEditing
          ? t("clients.toasts.updated")
          : t("clients.toasts.created"),
      });
      await loadClients();
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error ? error.message : t("clients.errors.save"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (client: ClientItem) => {
    try {
      const endpoint = client.isActive
        ? `/api/gerit/v1/clients/${client.id}/deactivate`
        : `/api/gerit/v1/clients/${client.id}/activate`;

      const response = await fetchWithAuth(endpoint, { method: "PATCH" });
      const responsePayload = (await response
        .json()
        .catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(responsePayload, t("clients.errors.status")),
        );
      }

      toast({
        title: t("clients.toasts.successTitle"),
        description: client.isActive
          ? t("clients.toasts.deactivated")
          : t("clients.toasts.activated"),
      });
      await loadClients();
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error ? error.message : t("clients.errors.status"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async (client: ClientItem) => {
    const confirmed = window.confirm(
      t("clients.confirm.delete", { name: client.name }),
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetchWithAuth(
        `/api/gerit/v1/clients/${client.id}`,
        {
          method: "DELETE",
        },
      );
      const responsePayload = (await response
        .json()
        .catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(responsePayload, t("clients.errors.delete")),
        );
      }

      toast({
        title: t("clients.toasts.successTitle"),
        description: t("clients.toasts.deleted"),
      });
      if (selectedClient?.id === client.id) {
        hideClientDetail();
      }
      await loadClients();
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error ? error.message : t("clients.errors.delete"),
        variant: "destructive",
      });
    }
  };

  const loadClientContacts = useCallback(async () => {
    if (!selectedClient) {
      setContacts([]);
      return;
    }

    setContactsLoading(true);

    const query = new URLSearchParams({
      ClientId: String(selectedClient.id),
      PageNumber: "1",
      PageSize: String(CONTACT_PAGE_SIZE),
      SortBy: "Name",
      SortDirection: "asc",
    });

    try {
      const response = await fetchWithAuth(
        `/api/gerit/v1/client-contacts/paged?${query.toString()}`,
        { method: "GET" },
      );

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(payload, t("clients.contacts.errors.load")),
        );
      }

      const parsed = parsePagedContacts(payload);
      setContacts(parsed.items);
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error
            ? error.message
            : t("clients.contacts.errors.load"),
        variant: "destructive",
      });
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, [fetchWithAuth, selectedClient, t, toast]);

  const loadClientAddresses = useCallback(async () => {
    if (!selectedClient) {
      setAddresses([]);
      return;
    }

    setAddressesLoading(true);

    const query = new URLSearchParams({
      ClientId: String(selectedClient.id),
      PageNumber: "1",
      PageSize: String(ADDRESS_PAGE_SIZE),
      SortBy: "Street",
      SortDirection: "asc",
    });

    try {
      const response = await fetchWithAuth(
        `/api/gerit/v1/client-addresses/paged?${query.toString()}`,
        { method: "GET" },
      );

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(payload, t("clients.addresses.errors.load")),
        );
      }

      const parsed = parsePagedAddresses(payload);
      setAddresses(parsed.items);
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error
            ? error.message
            : t("clients.addresses.errors.load"),
        variant: "destructive",
      });
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  }, [fetchWithAuth, selectedClient, t, toast]);

  useEffect(() => {
    if (!selectedClient) {
      setContacts([]);
      setAddresses([]);
      return;
    }
    void loadClientContacts();
    void loadClientAddresses();
  }, [selectedClient, loadClientContacts, loadClientAddresses]);

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClient) {
      return;
    }

    const name = contactFormState.name.trim();
    const phone = contactFormState.phone.trim();
    const email = contactFormState.email.trim();

    if (!name || !phone) {
      toast({
        title: t("clients.toasts.validationTitle"),
        description: t("clients.contacts.validation.required"),
        variant: "destructive",
      });
      return;
    }

    setContactSubmitting(true);

    try {
      const payload = {
        clientId: selectedClient.id,
        name,
        phone,
        email: email.length > 0 ? email : null,
      };

      const isEditing = editingContact !== null;
      const endpoint = isEditing
        ? `/api/gerit/v1/client-contacts/${editingContact.id}`
        : "/api/gerit/v1/client-contacts";
      const response = await fetchWithAuth(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response
        .json()
        .catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(
            responsePayload,
            t("clients.contacts.errors.save"),
          ),
        );
      }

      toast({
        title: t("clients.toasts.successTitle"),
        description: isEditing
          ? t("clients.contacts.toasts.updated")
          : t("clients.contacts.toasts.created"),
      });

      resetContactForm();
      await loadClientContacts();
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error
            ? error.message
            : t("clients.contacts.errors.save"),
        variant: "destructive",
      });
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleContactEdit = (contact: ContactItem) => {
    setEditingContact(contact);
    setContactFormState({
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
    });
  };

  const handleContactToggleStatus = async (contact: ContactItem) => {
    try {
      const endpoint = contact.isActive
        ? `/api/gerit/v1/client-contacts/${contact.id}/deactivate`
        : `/api/gerit/v1/client-contacts/${contact.id}/activate`;

      const response = await fetchWithAuth(endpoint, { method: "PATCH" });
      const responsePayload = (await response
        .json()
        .catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(
            responsePayload,
            t("clients.contacts.errors.status"),
          ),
        );
      }

      toast({
        title: t("clients.toasts.successTitle"),
        description: contact.isActive
          ? t("clients.contacts.toasts.deactivated")
          : t("clients.contacts.toasts.activated"),
      });

      await loadClientContacts();
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error
            ? error.message
            : t("clients.contacts.errors.status"),
        variant: "destructive",
      });
    }
  };

  const handleContactDelete = async (contact: ContactItem) => {
    const confirmed = window.confirm(
      t("clients.contacts.confirm.delete", { name: contact.name }),
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetchWithAuth(
        `/api/gerit/v1/client-contacts/${contact.id}`,
        {
          method: "DELETE",
        },
      );
      const responsePayload = (await response
        .json()
        .catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(
            responsePayload,
            t("clients.contacts.errors.delete"),
          ),
        );
      }

      toast({
        title: t("clients.toasts.successTitle"),
        description: t("clients.contacts.toasts.deleted"),
      });

      await loadClientContacts();
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error
            ? error.message
            : t("clients.contacts.errors.delete"),
        variant: "destructive",
      });
    }
  };

  const handleAddressSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClient) {
      return;
    }

    const street = addressFormState.street.trim();
    const city = addressFormState.city.trim();
    const state = addressFormState.state.trim();
    const postalCode = addressFormState.postalCode.trim();
    const country = addressFormState.country.trim();

    if (!street || !city) {
      toast({
        title: t("clients.toasts.validationTitle"),
        description: t("clients.addresses.validation.required"),
        variant: "destructive",
      });
      return;
    }

    setAddressSubmitting(true);

    try {
      const payload = {
        clientId: selectedClient.id,
        street,
        city,
        state: state.length > 0 ? state : null,
        postalCode: postalCode.length > 0 ? postalCode : null,
        country: country.length > 0 ? country : null,
      };

      const isEditing = editingAddress !== null;
      const endpoint = isEditing
        ? `/api/gerit/v1/client-addresses/${editingAddress.id}`
        : "/api/gerit/v1/client-addresses";
      const response = await fetchWithAuth(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response
        .json()
        .catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(
            responsePayload,
            t("clients.addresses.errors.save"),
          ),
        );
      }

      toast({
        title: t("clients.toasts.successTitle"),
        description: isEditing
          ? t("clients.addresses.toasts.updated")
          : t("clients.addresses.toasts.created"),
      });

      resetAddressForm();
      await loadClientAddresses();
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error
            ? error.message
            : t("clients.addresses.errors.save"),
        variant: "destructive",
      });
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleAddressEdit = (address: AddressItem) => {
    setEditingAddress(address);
    setAddressFormState({
      street: address.street ?? "",
      city: address.city ?? "",
      state: address.state ?? "",
      postalCode: address.postalCode ?? "",
      country: address.country ?? "",
    });
  };

  const handleAddressToggleStatus = async (address: AddressItem) => {
    try {
      const endpoint = address.isActive
        ? `/api/gerit/v1/client-addresses/${address.id}/deactivate`
        : `/api/gerit/v1/client-addresses/${address.id}/activate`;

      const response = await fetchWithAuth(endpoint, { method: "PATCH" });
      const responsePayload = (await response
        .json()
        .catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(
            responsePayload,
            t("clients.addresses.errors.status"),
          ),
        );
      }

      toast({
        title: t("clients.toasts.successTitle"),
        description: address.isActive
          ? t("clients.addresses.toasts.deactivated")
          : t("clients.addresses.toasts.activated"),
      });

      await loadClientAddresses();
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error
            ? error.message
            : t("clients.addresses.errors.status"),
        variant: "destructive",
      });
    }
  };

  const handleAddressDelete = async (address: AddressItem) => {
    const label = address.street ?? t("clients.addresses.table.street");
    const confirmed = window.confirm(
      t("clients.addresses.confirm.delete", { street: label }),
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetchWithAuth(
        `/api/gerit/v1/client-addresses/${address.id}`,
        {
          method: "DELETE",
        },
      );
      const responsePayload = (await response
        .json()
        .catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(
            responsePayload,
            t("clients.addresses.errors.delete"),
          ),
        );
      }

      toast({
        title: t("clients.toasts.successTitle"),
        description: t("clients.addresses.toasts.deleted"),
      });

      await loadClientAddresses();
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error
            ? error.message
            : t("clients.addresses.errors.delete"),
        variant: "destructive",
      });
    }
  };

  const getBulkResourceLabel = (resource: BulkResource) => {
    if (resource === "clients") {
      return t("clients.title");
    }

    if (resource === "client-contacts") {
      return t("clients.contacts.title");
    }

    return t("clients.addresses.title");
  };

  const getBulkUploadControl = (resource: BulkResource) => {
    if (resource === "clients") {
      return {
        uploading: clientsBulkUploading,
        setUploading: setClientsBulkUploading,
      };
    }

    if (resource === "client-contacts") {
      return {
        uploading: contactsBulkUploading,
        setUploading: setContactsBulkUploading,
      };
    }

    return {
      uploading: addressesBulkUploading,
      setUploading: setAddressesBulkUploading,
    };
  };

  const handleBulkUpload = async (
    resource: BulkResource,
    file: File | null,
  ) => {
    if (!file) {
      return;
    }

    if (resource !== "clients" && !selectedClient) {
      return;
    }

    const { uploading, setUploading } = getBulkUploadControl(resource);
    if (uploading) {
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (resource !== "clients" && selectedClient) {
        formData.append("ClientId", String(selectedClient.id));
      }

      const response = await fetchWithAuth(
        `/api/gerit/v1/${resource}/bulk-upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(
            payload,
            t("clients.bulk.upload.error", {
              resource: getBulkResourceLabel(resource),
            }),
          ),
        );
      }

      toast({
        title: t("clients.toasts.successTitle"),
        description: t("clients.bulk.upload.success", {
          resource: getBulkResourceLabel(resource),
        }),
      });

      if (resource === "clients") {
        await loadClients();
      } else if (resource === "client-contacts") {
        await loadClientContacts();
      } else {
        await loadClientAddresses();
      }
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error
            ? error.message
            : t("clients.bulk.upload.error", {
                resource: getBulkResourceLabel(resource),
              }),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const clientRowCells = useCallback(
    (client: ClientItem) => [client.name, client.email ?? "-", client.phone],
    [],
  );

  const renderClientStatus = useCallback(
    (client: ClientItem) => (
      <span
        className={clsx(
          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
          client.isActive
            ? "text[#3E515B] dark:text-[#84a0c0]"
            : "text[#3E515B] dark:text-[#84a0c0]",
        )}
      >
        {client.isActive
          ? t("clients.status.active")
          : t("clients.status.inactive")}
      </span>
    ),
    [t],
  );

  const renderClientActions = useCallback(
    (client: ClientItem) => (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleClientSelection(client);
          }}
          className="inline-flex h-8 w-8 items-center justify-center text-[#1f2f3f] transition-colors hover:text-[#0cbbf6] dark:border-[#38505d] dark:text-[#9eb1bc] dark:hover:text-white"
          title={t("clients.actions.edit")}
        >
          <SquarePen className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void handleToggleStatus(client);
          }}
          className="inline-flex h-8 w-8 items-center justify-center transition-colors hover:text-[#0cbbf6] dark:border-[#38505d] dark:text-[#9eb1bc] dark:hover:text-white"
          title={
            client.isActive
              ? t("clients.actions.deactivate")
              : t("clients.actions.activate")
          }
        >
          <Power className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void handleDeleteClient(client);
          }}
          className="inline-flex h-8 w-8 items-center justify-center transition-colors hover:text-[#ffd7e1]"
          title={t("clients.actions.delete")}
        >
          <Trash2 className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
        </button>
      </div>
    ),
    [handleClientSelection, handleDeleteClient, handleToggleStatus, t],
  );

  const gridToolbar = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-[#d1d9e5] bg-white px-4 text-sm font-medium text-[#1f2f3f] transition-colors hover:border-[#b4c2d9] hover:bg-[#f0f3fb] dark:border-[#405360] dark:bg-[#263844] dark:text-[#c9d8df] dark:hover:bg-[#2c404c]">
          {clientsBulkUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#08aee5]" />
          ) : null}
          {t("clients.bulk.upload.label")}
          <input
            type="file"
            accept=".csv"
            className="hidden"
            disabled={clientsBulkUploading}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleBulkUpload("clients", file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={showCreateClientForm}
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-[#08aee5] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0cbbf6]"
        >
          <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
          {t("clients.actions.add")}
        </button>
      </div>
    ),
    [clientsBulkUploading, handleBulkUpload, showCreateClientForm, t],
  );

  const pageCaption = useMemo(
    () => t("hubgrid.itemsLabel", { count: totalItems }),
    [t, totalItems],
  );

  const pageButtons = useMemo(() => {
    const maxVisible = 5;
    const pages: number[] = [];
    const normalTotal = Math.max(1, totalPagesFromServer);
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(normalTotal, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let index = start; index <= end; index += 1) {
      pages.push(index);
    }
    return pages;
  }, [page, totalPagesFromServer]);

  return (
    <WorkspaceShell>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="gerit-calendar-scrollbar min-h-0 flex-1 overflow-auto bg-[#f5f6f8] px-4 py-4 sm:px-6 dark:bg-[#253542]">
          <div className="mb-5 overflow-hidden rounded-sm border border-[#dfe6ed]/80 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:border-[#142435] dark:bg-[#0d1c29] dark:shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#dfe6ed]/70 bg-[#f4f6fb] px-6 py-5 dark:border-[#162235] dark:bg-[#0d1c29]">
              <div>
                <h1 className="text-3xl font-semibold tracking-[0.03em] text-[#0f172a] dark:text-white">
                  {t("clients.title")}
                </h1>
                <p className="mt-1 text-sm uppercase tracking-[0.3em] text-[#7aa4c0] dark:text-[#84a0c0]">
                  {t("clients.subtitle")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {gridToolbar}
              </div>
            </div>
          </div>

          <HubGrid
            title={t("clients.title")}
            subtitle={t("clients.subtitle")}
            columns={clientColumns}
            items={clients}
            renderRowCells={clientRowCells}
            renderStatus={renderClientStatus}
            statusColumnLabel={t("clients.table.status")}
            renderActions={renderClientActions}
            actionsColumnLabel={t("clients.table.actions")}
            rowDensity={rowDensity}
            densityOptions={densityOptions}
            onDensityChange={setRowDensity}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
            statusFilter={statusFilter}
            statusFilterOptions={[
              { value: "active", label: t("clients.filters.active") },
              { value: "inactive", label: t("clients.filters.inactive") },
              { value: "all", label: t("clients.filters.all") },
            ]}
            onStatusFilterChange={handleStatusFilterChange}
            statusFilterLabel={t("clients.filters.statusLabel")}
            searchValue={search}
            onSearchChange={handleSearchChange}
            searchPlaceholder={t("clients.filters.search")}
            loading={loading}
            loadingText={t("clients.loading")}
            emptyText={t("clients.empty")}
            pageCaption={pageCaption}
            page={page}
            totalPages={totalPagesFromServer}
            pageButtons={pageButtons}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
            paginationPreviousLabel={t("clients.pagination.previous")}
            paginationNextLabel={t("clients.pagination.next")}
            paginationPageLabel={t("clients.pagination.page")}
            paginationPerPageLabel={t("clients.pagination.perPage")}
            selectedRowKey={selectedClient?.id}
            getRowKey={(client) => client.id}
            onRowClick={handleClientSelection}
          />

          {detailVisible ? (
            <div className="mt-6 flex flex-col gap-4">
              <section className="rounded-sm border border-[#d9dee2] bg-white p-5 dark:border-[#18303c] dark:bg-[#1f2f3e]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0f172a] dark:text-[#d6e6ee]">
                      {selectedClient
                        ? t("clients.form.editTitle")
                        : t("clients.form.newTitle")}
                    </h2>
                    <p className="text-sm text-[#4f5c6a] dark:text-[#9eb1bc]">
                      {selectedClient
                        ? t("clients.form.subtitle")
                        : t("clients.detail.helper")}
                    </p>
                  </div>
                  {selectedClient ? (
                    <span
                      className={clsx(
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        selectedClient.isActive
                          ? "text-[#3E515B] dark:text-[#84a0c0]"
                          : "text-[#3E515B] dark:text-[#84a0c0]",
                      )}
                    >
                      {selectedClient.isActive
                        ? t("clients.status.active")
                        : t("clients.status.inactive")}
                    </span>
                  ) : null}
                </div>

                <form
                  className="mt-5 space-y-4"
                  onSubmit={(event) => void handleSubmit(event)}
                >
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                        {t("clients.form.name")}
                      </span>
                      <input
                        value={formState.name}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                        {t("clients.form.email")}
                      </span>
                      <input
                        value={formState.email}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm text-[#6b7280] dark:text-[#ffffff]">
                        {t("clients.form.phone")}
                      </span>
                      <input
                        value={formState.phone}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {detailVisible ? (
                      <button
                        type="button"
                        onClick={hideClientDetail}
                        className="h-10 rounded-md border border-[#38505d] px-4 text-sm font-medium text-[#c4d6de]"
                      >
                        {t("clients.actions.cancel")}
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-[#08aee5] px-4 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {t("clients.actions.save")}
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-sm border border-[#d9dee2] bg-white p-5 dark:border-[#18303c] dark:bg-[#1f2f3e]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#0f172a] dark:text-[#d6e6ee]">
                      {t("clients.contacts.title")}
                    </h3>
                    <p className="text-sm text-[#4f5c6a] dark:text-[#9eb1bc]">
                      {t("clients.contacts.subtitle")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(contactsBulkUploading || contactsLoading) && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#08aee5]" />
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-[#d1d9e5] bg-white px-3 py-2 text-sm font-medium text-[#1f2f3f] transition-colors hover:border-[#b4c2d9] hover:bg-[#f0f3fb] dark:border-[#405360] dark:bg-[#263844] dark:text-[#c9d8df] dark:hover:bg-[#2c404c]">
                      {t("clients.contacts.bulk.label")}
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        disabled={!selectedClient || contactsBulkUploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          void handleBulkUpload("client-contacts", file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>

                {selectedClient ? (
                  <div className="mt-4 space-y-4">
                    <form
                      className="space-y-3"
                      onSubmit={(event) => void handleContactSubmit(event)}
                    >
                      <div className="grid gap-3 lg:grid-cols-3">
                        <label className="block">
                          <span className="mb-1.5 block text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                            {t("clients.contacts.form.name")}
                          </span>
                          <input
                            value={contactFormState.name}
                            onChange={(event) =>
                              setContactFormState((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                            {t("clients.contacts.form.email")}
                          </span>
                          <input
                            value={contactFormState.email}
                            onChange={(event) =>
                              setContactFormState((current) => ({
                                ...current,
                                email: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                            {t("clients.contacts.form.phone")}
                          </span>
                          <input
                            value={contactFormState.phone}
                            onChange={(event) =>
                              setContactFormState((current) => ({
                                ...current,
                                phone: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                          />
                        </label>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {editingContact ? (
                          <button
                            type="button"
                            onClick={resetContactForm}
                            className="h-10 rounded-md border border-[#38505d] px-4 text-sm font-medium text-[#c4d6de]"
                          >
                            {t("clients.actions.cancel")}
                          </button>
                        ) : null}
                        <button
                          type="submit"
                          disabled={contactSubmitting}
                          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#08aee5] px-4 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {contactSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : null}
                          {t("clients.actions.save")}
                        </button>
                      </div>
                    </form>

                    <div className="overflow-hidden rounded-sm border border-[#18303c]">
                      <table className="w-full table-fixed border-collapse">
                        <thead>
                          <tr className="bg-[#f3f5fb] text-left text-xs uppercase tracking-[0.08em] text-[#000000] dark:bg-[#1f2f3e] dark:text-[#8da7b4]">
                            <th className="px-4 py-3 font-medium text-center">
                              {t("clients.contacts.table.name")}
                            </th>
                            <th className="px-4 py-3 font-medium text-center  ">
                              {t("clients.contacts.table.email")}
                            </th>
                            <th className="px-4 py-3 font-medium text-center">
                              {t("clients.contacts.table.phone")}
                            </th>
                            <th className="px-4 py-3 font-medium text-center">
                              {t("clients.table.status")}
                            </th>
                            <th className="w-[10rem] px-4 py-3 font-medium text-center">
                              {t("clients.contacts.table.actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {contactsLoading ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-6">
                                <div className="flex items-center justify-center gap-2 text-[#4f5c6a] dark:text-[#9eb1bc]">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {t("clients.loading")}
                                </div>
                              </td>
                            </tr>
                          ) : contacts.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-6 text-center text-sm text-[#4f5c6a] dark:text-[#9eb1bc]"
                              >
                                {t("clients.contacts.empty")}
                              </td>
                            </tr>
                          ) : (
                            contacts.map((contact) => (
                              <tr
                                key={contact.id}
                                className="border-t border-[#e4e8f0] bg-white text-[#11191f] transition-colors hover:bg-[#ebeff7] dark:border-[#18303c] dark:bg-[#1f2f3e] dark:text-[#d6e6ee] dark:hover:bg-[#223544]"
                              >
                                <td className="truncate px-4 py-3 text-sm font-semibold">
                                  {contact.name}
                                </td>
                                <td className="truncate px-4 py-3 text-sm text-[#1f2f3f] dark:text-[#a4bac6]">
                                  {contact.email ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-[#1f2f3f] dark:text-[#a4bac6]">
                                  {contact.phone ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span
                                    className={clsx(
                                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                      contact.isActive
                                        ? "text-[#3E515B] dark:text-[#84a0c0]"
                                        : "text-[#3E515B] dark:text-[#84a0c0]",
                                    )}
                                  >
                                    {contact.isActive
                                      ? t("clients.status.active")
                                      : t("clients.status.inactive")}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleContactEdit(contact)}
                                      className="inline-flex h-8 w-8 items-center justify-center transition-colors hover:text-[#0cbbf6] dark:border-[#38505d] dark:text-[#84a0c0] dark:hover:text-white"
                                      title={t("clients.actions.edit")}
                                    >
                                      <SquarePen className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleContactToggleStatus(contact)
                                      }
                                      className="inline-flex h-8 w-8 items-center justify-center transition-colors hover:text-[#0cbbf6] dark:border-[#38505d] dark:text-[#84a0c0] dark:hover:text-white"
                                      title={
                                        contact.isActive
                                          ? t("clients.actions.deactivate")
                                          : t("clients.actions.activate")
                                      }
                                    >
                                      <Power className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleContactDelete(contact)
                                      }
                                      className="inline-flex h-8 w-8 items-center justify-center transition-colors hover:text-[#ffd7e1]"
                                      title={t("clients.actions.delete")}
                                    >
                                      <Trash2 className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#4f5c6a] dark:text-[#9eb1bc]">
                    {t("clients.detail.helper")}
                  </p>
                )}
              </section>

              <section className="rounded-sm border border-[#d9dee2] bg-white p-5 dark:border-[#18303c] dark:bg-[#1f2f3e]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#0f172a] dark:text-[#d6e6ee]">
                      {t("clients.addresses.title")}
                    </h3>
                    <p className="text-sm text-[#4f5c6a] dark:text-[#9eb1bc]">
                      {t("clients.addresses.subtitle")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(addressesBulkUploading || addressesLoading) && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#08aee5]" />
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-[#d1d9e5] bg-white px-3 py-2 text-sm font-medium text-[#1f2f3f] transition-colors hover:border-[#b4c2d9] hover:bg-[#f0f3fb] dark:border-[#405360] dark:bg-[#263844] dark:text-[#c9d8df] dark:hover:bg-[#2c404c]">
                      {t("clients.addresses.bulk.label")}
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        disabled={!selectedClient || addressesBulkUploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          void handleBulkUpload("client-addresses", file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>

                {selectedClient ? (
                  <div className="mt-4 space-y-4">
                    <form
                      className="space-y-3"
                      onSubmit={(event) => void handleAddressSubmit(event)}
                    >
                      <div className="grid gap-3 lg:grid-cols-2">
                        <label className="block">
                          <span className="mb-1.5 block text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                            {t("clients.addresses.form.street")}
                          </span>
                          <input
                            value={addressFormState.street}
                            onChange={(event) =>
                              setAddressFormState((current) => ({
                                ...current,
                                street: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                            {t("clients.addresses.form.city")}
                          </span>
                          <input
                            value={addressFormState.city}
                            onChange={(event) =>
                              setAddressFormState((current) => ({
                                ...current,
                                city: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                            {t("clients.addresses.form.state")}
                          </span>
                          <input
                            value={addressFormState.state}
                            onChange={(event) =>
                              setAddressFormState((current) => ({
                                ...current,
                                state: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                            {t("clients.addresses.form.postalCode")}
                          </span>
                          <input
                            value={addressFormState.postalCode}
                            onChange={(event) =>
                              setAddressFormState((current) => ({
                                ...current,
                                postalCode: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                          />
                        </label>
                        <label className="block lg:col-span-2">
                          <span className="mb-1.5 block text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                            {t("clients.addresses.form.country")}
                          </span>
                          <input
                            value={addressFormState.country}
                            onChange={(event) =>
                              setAddressFormState((current) => ({
                                ...current,
                                country: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                          />
                        </label>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {editingAddress ? (
                          <button
                            type="button"
                            onClick={resetAddressForm}
                            className="h-10 rounded-md border border-[#38505d] px-4 text-sm font-medium text-[#c4d6de]"
                          >
                            {t("clients.actions.cancel")}
                          </button>
                        ) : null}
                        <button
                          type="submit"
                          disabled={addressSubmitting}
                          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#08aee5] px-4 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {addressSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : null}
                          {t("clients.actions.save")}
                        </button>
                      </div>
                    </form>

                    <div className="overflow-hidden rounded-sm border border-[#18303c]">
                      <table className="w-full table-fixed border-collapse">
                        <thead>
                          <tr className="bg-[#f3f5fb] text-left text-xs uppercase tracking-[0.08em] text-[#6b7280] dark:bg-[#1f2f3e] dark:text-[#8da7b4]">
                            <th className="px-4 py-3 font-medium">
                              {t("clients.addresses.table.street")}
                            </th>
                            <th className="px-4 py-3 font-medium">
                              {t("clients.addresses.table.city")}
                            </th>
                            <th className="px-4 py-3 font-medium">
                              {t("clients.addresses.table.state")}
                            </th>
                            <th className="px-4 py-3 font-medium">
                              {t("clients.addresses.table.postalCode")}
                            </th>
                            <th className="px-4 py-3 font-medium">
                              {t("clients.addresses.table.country")}
                            </th>
                            <th className="px-4 py-3 font-medium">
                              {t("clients.table.status")}
                            </th>
                            <th className="w-[10rem] px-4 py-3 font-medium">
                              {t("clients.addresses.table.actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {addressesLoading ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-6">
                                <div className="flex items-center justify-center gap-2 text-[#4f5c6a] dark:text-[#9eb1bc]">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  {t("clients.loading")}
                                </div>
                              </td>
                            </tr>
                          ) : addresses.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-6 text-center text-sm text-[#4f5c6a] dark:text-[#9eb1bc]"
                              >
                                {t("clients.addresses.empty")}
                              </td>
                            </tr>
                          ) : (
                            addresses.map((address) => (
                              <tr
                                key={address.id}
                                className="border-t border-[#e4e8f0] bg-white text-[#11191f] transition-colors hover:bg-[#ebeff7] dark:border-[#18303c] dark:bg-[#1f2f3e] dark:text-[#d6e6ee] dark:hover:bg-[#223544]"
                              >
                                <td className="truncate px-4 py-3 text-sm font-semibold">
                                  {address.street ?? "-"}
                                </td>
                                <td className="truncate px-4 py-3 text-sm text-[#1f2f3f] dark:text-[#a4bac6]">
                                  {address.city ?? "-"}
                                </td>
                                <td className="truncate px-4 py-3 text-sm text-[#1f2f3f] dark:text-[#a4bac6]">
                                  {address.state ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-[#1f2f3f] dark:text-[#a4bac6]">
                                  {address.postalCode ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-sm text-[#1f2f3f] dark:text-[#a4bac6]">
                                  {address.country ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span
                                    className={clsx(
                                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                      address.isActive
                                        ? "text-[#3E515B] dark:text-[#84a0c0]"
                                        : "text-[#3E515B] dark:text-[#84a0c0]",
                                    )}
                                  >
                                    {address.isActive
                                      ? t("clients.status.active")
                                      : t("clients.status.inactive")}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleAddressEdit(address)}
                                      className="inline-flex h-8 w-8 items-center justify-center text-[#1f2f3f] transition-colors hover:text-[#0cbbf6] dark:border-[#38505d] dark:text-[#9eb1bc] dark:hover:text-white"
                                      title={t("clients.actions.edit")}
                                    >
                                      <SquarePen className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleAddressToggleStatus(address)
                                      }
                                      className="inline-flex h-8 w-8 items-center justify-center text-[#1f2f3f] transition-colors hover:text-[#0cbbf6] dark:border-[#38505d] dark:text-[#9eb1bc] dark:hover:text-white"
                                      title={
                                        address.isActive
                                          ? t("clients.actions.deactivate")
                                          : t("clients.actions.activate")
                                      }
                                    >
                                      <Power className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleAddressDelete(address)
                                      }
                                      className="inline-flex h-8 w-8 items-center justify-center text-[#e7a9b8] transition-colors hover:text-[#ffd7e1]"
                                      title={t("clients.actions.delete")}
                                    >
                                      <Trash2 className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#4f5c6a] dark:text-[#9eb1bc]">
                    {t("clients.detail.helper")}
                  </p>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </WorkspaceShell>
  );
}
