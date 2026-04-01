"use client";

import clsx from "clsx";
import { Loader2, Power, SquarePen, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/platform/auth";
import { useTranslation } from "@/platform/i18n";
import { WorkspaceShell } from "@/shared/layout";
import { useToast } from "@/shared/feedback";
import { ClientItem } from "@/domains/operations/clients/client-models";
import {
  HubGrid,
  type HubGridColumn,
  type RowDensity,
} from "@/shared/hub-grid";
import { HubTabs } from "@/shared/ui";
import {
  normalizeClient,
  normalizeErrorMessage,
} from "@/domains/operations/clients/client-utils";

const CONTACT_PAGE_SIZE = 25;
const ADDRESS_PAGE_SIZE = 25;
const CONTACT_GRID_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const ADDRESS_GRID_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type ContactSortColumn = "Name" | "Email" | "Phone";
type AddressSortColumn = "Street" | "City" | "State" | "PostalCode" | "Country";

const PAGE_BUTTON_MAX = 5;

function buildPageButtons(page: number, totalPages: number) {
  const pages: number[] = [];
  const normalTotal = Math.max(1, totalPages);
  let start = Math.max(1, page - Math.floor(PAGE_BUTTON_MAX / 2));
  let end = Math.min(normalTotal, start + PAGE_BUTTON_MAX - 1);
  start = Math.max(1, end - PAGE_BUTTON_MAX + 1);
  for (let index = start; index <= end; index += 1) {
    pages.push(index);
  }
  return pages;
}

function getContactSortValue(item: ContactItem, column: ContactSortColumn) {
  switch (column) {
    case "Email":
      return (item.email ?? "").toLowerCase();
    case "Phone":
      return (item.phone ?? "").toLowerCase();
    default:
      return item.name.toLowerCase();
  }
}

function getAddressSortValue(item: AddressItem, column: AddressSortColumn) {
  switch (column) {
    case "City":
      return (item.city ?? "").toLowerCase();
    case "State":
      return (item.state ?? "").toLowerCase();
    case "PostalCode":
      return (item.postalCode ?? "").toLowerCase();
    case "Country":
      return (item.country ?? "").toLowerCase();
    default:
      return (item.street ?? "").toLowerCase();
  }
}

interface ContactItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  isPrimary: boolean;
}

interface ContactsPagedResponse {
  items?: unknown;
  totalItems?: unknown;
}

interface ClientFormState {
  name: string;
  email: string;
  phone: string;
  clientType: string;
  origin: string;
  website: string;
  score: string;
  consent: boolean;
  isActive: boolean;
  remarks: string;
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
  isPrimary: boolean;
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
type ClientTab = "client" | "contacts" | "addresses";

const initialClientFormState: ClientFormState = {
  name: "",
  email: "",
  phone: "",
  clientType: "",
  origin: "",
  website: "",
  score: "",
  consent: true,
  isActive: true,
  remarks: "",
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

interface EnumOption {
  value: string;
  labelKey: string;
  description: string;
}

const CLIENT_TYPE_OPTIONS: EnumOption[] = [
  {
    value: "1",
    labelKey: "clients.enums.clientType.PessoaSingular",
    description: "Pessoa Singular",
  },
  {
    value: "2",
    labelKey: "clients.enums.clientType.RecibosVerdes",
    description: "Recibos Verdes",
  },
  {
    value: "3",
    labelKey: "clients.enums.clientType.Freelancer",
    description: "Freelancer",
  },
  {
    value: "4",
    labelKey: "clients.enums.clientType.PessoaJuridica",
    description: "Pessoa Jurídica",
  },
  {
    value: "5",
    labelKey: "clients.enums.clientType.SociedadeUnipessoalQuotas",
    description: "Sociedade Unipessoal por Quotas",
  },
];

const ORIGIN_OPTIONS: EnumOption[] = [
  {
    value: "1",
    labelKey: "clients.enums.origin.Outros",
    description: "Outros",
  },
  {
    value: "2",
    labelKey: "clients.enums.origin.Instagram",
    description: "Instagram",
  },
  {
    value: "3",
    labelKey: "clients.enums.origin.Facebook",
    description: "Facebook",
  },
  {
    value: "4",
    labelKey: "clients.enums.origin.LinkedIn",
    description: "LinkedIn",
  },
  {
    value: "5",
    labelKey: "clients.enums.origin.YouTube",
    description: "YouTube",
  },
  {
    value: "6",
    labelKey: "clients.enums.origin.WhatsApp",
    description: "WhatsApp",
  },
  {
    value: "7",
    labelKey: "clients.enums.origin.TikTok",
    description: "TikTok",
  },
  {
    value: "8",
    labelKey: "clients.enums.origin.Google",
    description: "Google",
  },
  {
    value: "9",
    labelKey: "clients.enums.origin.Amigos",
    description: "Amigos",
  },
  { value: "10", labelKey: "clients.enums.origin.Tv", description: "TV" },
  { value: "11", labelKey: "clients.enums.origin.Radio", description: "Rádio" },
  {
    value: "12",
    labelKey: "clients.enums.origin.Jornal",
    description: "Jornal",
  },
  {
    value: "13",
    labelKey: "clients.enums.origin.Revista",
    description: "Revista",
  },
];

const CLIENT_TYPE_DESCRIPTION_TO_VALUE = Object.fromEntries(
  CLIENT_TYPE_OPTIONS.map((option) => [option.description, option.value]),
) as Record<string, string>;

const ORIGIN_DESCRIPTION_TO_VALUE = Object.fromEntries(
  ORIGIN_OPTIONS.map((option) => [option.description, option.value]),
) as Record<string, string>;

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
  onLabel: string;
  offLabel: string;
}

function ToggleField({
  label,
  checked,
  onChange,
  disabled,
  className,
  onLabel,
  offLabel,
}: ToggleFieldProps) {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <span className="mb-1.5 block text-sm font-semibold text-[#94a5b4] dark:text-[#8da7b4]">
        {label}
      </span>
      <div className="flex w-full">
        <label className="relative inline-flex">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            className="peer sr-only"
          />
          <span className="flex h-7 w-12 items-center rounded-full bg-[#d7e0e5] px-1 transition-colors peer-checked:bg-[#08aee5] dark:bg-[#284451] dark:peer-checked:bg-[#11b7ff]">
            <span className="h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      </div>
    </div>
  );
}

function resolveClientTypeValue(client: ClientItem | null): string {
  if (!client) {
    return "";
  }

  if (typeof client.clientType === "number") {
    return String(client.clientType);
  }

  if (client.clientTypeDescription) {
    return CLIENT_TYPE_DESCRIPTION_TO_VALUE[client.clientTypeDescription] ?? "";
  }

  return "";
}

function resolveOriginValue(client: ClientItem | null): string {
  if (!client) {
    return "";
  }

  if (client.origin) {
    const parsedNumber = Number(client.origin);
    if (!Number.isNaN(parsedNumber)) {
      return String(parsedNumber);
    }

    return ORIGIN_DESCRIPTION_TO_VALUE[client.origin] ?? "";
  }

  return "";
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

  const isPrimaryValue =
    typeof candidate.isPrimary === "boolean" ? candidate.isPrimary : false;

  return {
    id: rawId,
    name,
    email,
    phone,
    isActive: Boolean(isActiveValue),
    isPrimary: Boolean(isPrimaryValue),
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

  const isPrimaryValue =
    typeof candidate.isPrimary === "boolean" ? candidate.isPrimary : false;

  return {
    id: rawId,
    street,
    city,
    state,
    postalCode,
    country,
    isActive: Boolean(isActiveValue),
    isPrimary: Boolean(isPrimaryValue),
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

export function ClientsDetailsPage() {
  const { fetchWithAuth, isHydrating, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const clientId = useMemo(() => {
    const raw = searchParams.get("clientId");
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  const [client, setClient] = useState<ClientItem | null>(null);
  const [clientFormState, setClientFormState] = useState(
    initialClientFormState,
  );
  const [loadingClient, setLoadingClient] = useState(false);
  const [submittingClient, setSubmittingClient] = useState(false);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactFormState, setContactFormState] = useState<ContactFormState>(
    initialContactFormState,
  );
  const [editingContact, setEditingContact] = useState<ContactItem | null>(
    null,
  );
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactsBulkUploading, setContactsBulkUploading] = useState(false);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressFormState, setAddressFormState] = useState<AddressFormState>(
    initialAddressFormState,
  );
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(
    null,
  );
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressesBulkUploading, setAddressesBulkUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientTab>("client");
  const [contactGridDensity, setContactGridDensity] =
    useState<RowDensity>("medium");
  const [contactSearch, setContactSearch] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState("all");
  const [contactPage, setContactPage] = useState(1);
  const [contactPageSize, setContactPageSize] = useState(
    CONTACT_GRID_PAGE_SIZE_OPTIONS[1],
  );
  const [contactSortBy, setContactSortBy] = useState<ContactSortColumn>("Name");
  const [contactSortDirection, setContactSortDirection] = useState<
    "asc" | "desc"
  >("asc");
  const [addressGridDensity, setAddressGridDensity] =
    useState<RowDensity>("medium");
  const [addressSearch, setAddressSearch] = useState("");
  const [addressStatusFilter, setAddressStatusFilter] = useState("all");
  const [addressPage, setAddressPage] = useState(1);
  const [addressPageSize, setAddressPageSize] = useState(
    ADDRESS_GRID_PAGE_SIZE_OPTIONS[1],
  );
  const [addressSortBy, setAddressSortBy] =
    useState<AddressSortColumn>("Street");
  const [addressSortDirection, setAddressSortDirection] = useState<
    "asc" | "desc"
  >("asc");

  const resetContactForm = useCallback(() => {
    setEditingContact(null);
    setContactFormState(initialContactFormState);
  }, []);

  const resetAddressForm = useCallback(() => {
    setEditingAddress(null);
    setAddressFormState(initialAddressFormState);
  }, []);

  const resetClientForm = useCallback(() => {
    setClientFormState(initialClientFormState);
  }, []);

  const loadClient = useCallback(async () => {
    if (!clientId) {
      return;
    }

    setLoadingClient(true);

    try {
      const response = await fetchWithAuth(
        `/api/gerit/v1/clients/${clientId}`,
        { method: "GET" },
      );
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(
          normalizeErrorMessage(payload, t("clients.errors.load")),
        );
      }

      const normalized = normalizeClient(payload);
      if (normalized) {
        setClient(normalized);
        setClientFormState({
          name: normalized.name,
          email: normalized.email ?? "",
          phone: normalized.phone,
          clientType: resolveClientTypeValue(normalized),
          origin: resolveOriginValue(normalized),
          website: normalized.website ?? "",
          score:
            typeof normalized.score === "number"
              ? String(normalized.score)
              : "",
          consent: normalized.consent ?? true,
          isActive: normalized.isActive,
          remarks: normalized.remarks ?? "",
        });
      } else {
        setClient(null);
      }
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error ? error.message : t("clients.errors.load"),
        variant: "destructive",
      });
    } finally {
      setLoadingClient(false);
    }
  }, [clientId, fetchWithAuth, t, toast]);

  const loadClientContacts = useCallback(async () => {
    if (!client?.id) {
      setContacts([]);
      return;
    }

    setContactsLoading(true);

    const query = new URLSearchParams({
      PageNumber: "1",
      PageSize: String(CONTACT_PAGE_SIZE),
      SortBy: "Name",
      SortDirection: "asc",
    });

    try {
      const response = await fetchWithAuth(
        `/api/gerit/v1/client/${client.id}/contacts/paged?${query.toString()}`,
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
  }, [client, fetchWithAuth, t, toast]);

  const loadClientAddresses = useCallback(async () => {
    if (!client?.id) {
      setAddresses([]);
      return;
    }

    setAddressesLoading(true);

    const query = new URLSearchParams({
      PageNumber: "1",
      PageSize: String(ADDRESS_PAGE_SIZE),
      SortBy: "Street",
      SortDirection: "asc",
    });

    try {
      const response = await fetchWithAuth(
        `/api/gerit/v1/client/${client.id}/addresses/paged?${query.toString()}`,
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
  }, [client, fetchWithAuth, t, toast]);

  useEffect(() => {
    if (!isHydrating && isAuthenticated) {
      if (clientId) {
        void loadClient();
      } else {
        setClient(null);
        resetClientForm();
        setContacts([]);
        setAddresses([]);
      }
    }
  }, [clientId, isAuthenticated, isHydrating, loadClient, resetClientForm]);

  useEffect(() => {
    if (!client) {
      setContacts([]);
      setAddresses([]);
      return;
    }
    void loadClientContacts();
    void loadClientAddresses();
  }, [client, loadClientContacts, loadClientAddresses]);

  const handleClientSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const name = clientFormState.name.trim();
      const phone = clientFormState.phone.trim();
      const email = clientFormState.email.trim();
      const clientTypeValue = clientFormState.clientType.trim();
      const originValue = clientFormState.origin.trim();
      const websiteValue = clientFormState.website.trim();
      const scoreValue = clientFormState.score.trim();
      const scoreNumber =
        scoreValue.length > 0 && !Number.isNaN(Number(scoreValue))
          ? Number(scoreValue)
          : null;
      const remarksValue = clientFormState.remarks.trim();

      if (!name || !phone) {
        toast({
          title: t("clients.toasts.validationTitle"),
          description: t("clients.validation.required"),
          variant: "destructive",
        });
        return;
      }

      setSubmittingClient(true);

      try {
        const clientTypeNumber =
          clientTypeValue.length > 0 && !Number.isNaN(Number(clientTypeValue))
            ? Number(clientTypeValue)
            : null;
        const originNumber =
          originValue.length > 0 && !Number.isNaN(Number(originValue))
            ? Number(originValue)
            : null;

        const payload = {
          name,
          email: email.length > 0 ? email : null,
          phone,
          clientType: clientTypeNumber,
          origin: originNumber,
          website: websiteValue.length > 0 ? websiteValue : null,
          score: scoreNumber,
          consent: clientFormState.consent,
          isActive: clientFormState.isActive,
          remarks: remarksValue.length > 0 ? remarksValue : null,
        };

        const isEditing = Boolean(client?.id);
        const endpoint = isEditing
          ? `/api/gerit/v1/clients/${client?.id}`
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
          setClient(normalized);
          setClientFormState({
            name: normalized.name,
            email: normalized.email ?? "",
            phone: normalized.phone,
            clientType: normalized.clientTypeDescription ?? "",
            origin: normalized.origin ?? "",
            website: normalized.website ?? "",
            score:
              typeof normalized.score === "number"
                ? String(normalized.score)
                : "",
            consent: normalized.consent ?? true,
            remarks: normalized.remarks ?? "",
          });
          if (!isEditing) {
            void router.replace(
              `/operations/clients-details?clientId=${normalized.id}`,
            );
          }
        }

        toast({
          title: t("clients.toasts.successTitle"),
          description: isEditing
            ? t("clients.toasts.updated")
            : t("clients.toasts.created"),
        });
        if (normalized?.id) {
          await loadClientContacts();
          await loadClientAddresses();
        }
      } catch (error) {
        toast({
          title: t("clients.toasts.errorTitle"),
          description:
            error instanceof Error ? error.message : t("clients.errors.save"),
          variant: "destructive",
        });
      } finally {
        setSubmittingClient(false);
      }
    },
    [
      client,
      clientFormState.email,
      clientFormState.name,
      clientFormState.phone,
      clientFormState.clientType,
      clientFormState.origin,
      clientFormState.website,
      clientFormState.score,
      clientFormState.consent,
      clientFormState.remarks,
      fetchWithAuth,
      loadClientAddresses,
      loadClientContacts,
      router,
      t,
      toast,
    ],
  );

  const handleClientToggleStatus = useCallback(async () => {
    if (!client) {
      return;
    }

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
      await loadClient();
    } catch (error) {
      toast({
        title: t("clients.toasts.errorTitle"),
        description:
          error instanceof Error ? error.message : t("clients.errors.status"),
        variant: "destructive",
      });
    }
  }, [client, fetchWithAuth, loadClient, t, toast]);

  const handleContactSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!client) {
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
          name,
          phone,
          email: email.length > 0 ? email : null,
        };

        const isEditing = editingContact !== null;
        const endpoint = isEditing
          ? `/api/gerit/v1/client/${client.id}/contacts/${editingContact?.id}`
          : `/api/gerit/v1/client/${client.id}/contacts`;
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
    },
    [
      client,
      contactFormState.email,
      contactFormState.name,
      contactFormState.phone,
      editingContact,
      fetchWithAuth,
      loadClientContacts,
      resetContactForm,
      t,
      toast,
    ],
  );

  const handleContactEdit = useCallback((contact: ContactItem) => {
    setEditingContact(contact);
    setContactFormState({
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
    });
  }, []);

  const handleContactToggleStatus = useCallback(
    async (contact: ContactItem) => {
      if (!client?.id) {
        return;
      }

      try {
        const endpoint = contact.isActive
          ? `/api/gerit/v1/client/${client.id}/contacts/${contact.id}/deactivate`
          : `/api/gerit/v1/client/${client.id}/contacts/${contact.id}/activate`;
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
    },
    [client, fetchWithAuth, loadClientContacts, t, toast],
  );

  const handleContactDelete = useCallback(
    async (contact: ContactItem) => {
      const confirmed = window.confirm(
        t("clients.contacts.confirm.delete", { name: contact.name }),
      );
      if (!confirmed) {
        return;
      }

      if (!client?.id) {
        return;
      }

      try {
        const response = await fetchWithAuth(
          `/api/gerit/v1/client/${client.id}/contacts/${contact.id}`,
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
    },
    [client, fetchWithAuth, loadClientContacts, t, toast],
  );

  const handleAddressSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!client) {
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
          street,
          city,
          state: state.length > 0 ? state : null,
          postalCode: postalCode.length > 0 ? postalCode : null,
          country: country.length > 0 ? country : null,
        };

        const isEditing = editingAddress !== null;
        const endpoint = isEditing
          ? `/api/gerit/v1/client/${client.id}/addresses/${editingAddress?.id}`
          : `/api/gerit/v1/client/${client.id}/addresses`;
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
    },
    [
      addressFormState.city,
      addressFormState.country,
      addressFormState.postalCode,
      addressFormState.state,
      addressFormState.street,
      client,
      editingAddress,
      fetchWithAuth,
      loadClientAddresses,
      resetAddressForm,
      t,
      toast,
    ],
  );

  const handleAddressEdit = useCallback((address: AddressItem) => {
    setEditingAddress(address);
    setAddressFormState({
      street: address.street ?? "",
      city: address.city ?? "",
      state: address.state ?? "",
      postalCode: address.postalCode ?? "",
      country: address.country ?? "",
    });
  }, []);

  const handleAddressToggleStatus = useCallback(
    async (address: AddressItem) => {
      if (!client?.id) {
        return;
      }

      try {
        const endpoint = address.isActive
          ? `/api/gerit/v1/client/${client.id}/addresses/${address.id}/deactivate`
          : `/api/gerit/v1/client/${client.id}/addresses/${address.id}/activate`;
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
    },
    [client, fetchWithAuth, loadClientAddresses, t, toast],
  );

  const handleAddressDelete = useCallback(
    async (address: AddressItem) => {
      const label = address.street ?? t("clients.addresses.table.street");
      const confirmed = window.confirm(
        t("clients.addresses.confirm.delete", { street: label }),
      );
      if (!confirmed) {
        return;
      }

      if (!client?.id) {
        return;
      }

      try {
        const response = await fetchWithAuth(
          `/api/gerit/v1/client/${client.id}/addresses/${address.id}`,
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
    },
    [client, fetchWithAuth, loadClientAddresses, t, toast],
  );

  const handleContactsBulkUpload = useCallback(
    async (file: File | null) => {
      if (!file || contactsBulkUploading || !client?.id) {
        return;
      }

      setContactsBulkUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetchWithAuth(
          `/api/gerit/v1/client/${client.id}/contacts/bulk-upload`,
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
                resource: t("clients.contacts.title"),
              }),
            ),
          );
        }

        toast({
          title: t("clients.toasts.successTitle"),
          description: t("clients.bulk.upload.success", {
            resource: t("clients.contacts.title"),
          }),
        });

        await loadClientContacts();
      } catch (error) {
        toast({
          title: t("clients.toasts.errorTitle"),
          description:
            error instanceof Error
              ? error.message
              : t("clients.bulk.upload.error", {
                  resource: t("clients.contacts.title"),
                }),
          variant: "destructive",
        });
      } finally {
        setContactsBulkUploading(false);
      }
    },
    [
      client,
      contactsBulkUploading,
      fetchWithAuth,
      loadClientContacts,
      t,
      toast,
    ],
  );

  const handleAddressesBulkUpload = useCallback(
    async (file: File | null) => {
      if (!file || addressesBulkUploading || !client?.id) {
        return;
      }

      setAddressesBulkUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetchWithAuth(
          `/api/gerit/v1/client/${client.id}/addresses/bulk-upload`,
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
                resource: t("clients.addresses.title"),
              }),
            ),
          );
        }

        toast({
          title: t("clients.toasts.successTitle"),
          description: t("clients.bulk.upload.success", {
            resource: t("clients.addresses.title"),
          }),
        });

        await loadClientAddresses();
      } catch (error) {
        toast({
          title: t("clients.toasts.errorTitle"),
          description:
            error instanceof Error
              ? error.message
              : t("clients.bulk.upload.error", {
                  resource: t("clients.addresses.title"),
                }),
          variant: "destructive",
        });
      } finally {
        setAddressesBulkUploading(false);
      }
    },
    [
      addressesBulkUploading,
      client,
      fetchWithAuth,
      loadClientAddresses,
      t,
      toast,
    ],
  );

  const primaryContact = useMemo(
    () => contacts.find((contact) => contact.isPrimary) ?? contacts[0] ?? null,
    [contacts],
  );

  const primaryAddress = useMemo(
    () =>
      addresses.find((address) => address.isPrimary) ?? addresses[0] ?? null,
    [addresses],
  );

  const gridDensityOptions = useMemo(
    () => [
      { key: "compact" as const, label: t("clients.grid.density.slow") },
      { key: "medium" as const, label: t("clients.grid.density.medium") },
      {
        key: "expanded" as const,
        label: t("clients.grid.density.expanded"),
      },
    ],
    [t],
  );

  const contactColumns = useMemo<HubGridColumn<ContactItem>[]>(
    () => [
      {
        key: "Name",
        label: t("clients.contacts.table.name"),
      },
      {
        key: "Email",
        label: t("clients.contacts.table.email"),
      },
      {
        key: "Phone",
        label: t("clients.contacts.table.phone"),
      },
    ],
    [t],
  );

  const contactStatusFilterOptions = useMemo(
    () => [
      { value: "active", label: t("clients.filters.active") },
      { value: "inactive", label: t("clients.filters.inactive") },
      { value: "all", label: t("clients.filters.all") },
    ],
    [t],
  );

  const filteredContacts = useMemo(() => {
    const searchTerm = contactSearch.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (contactStatusFilter !== "all") {
        const expected = contactStatusFilter === "active";
        if (contact.isActive !== expected) {
          return false;
        }
      }
      if (!searchTerm) {
        return true;
      }
      const email = contact.email ?? "";
      const phone = contact.phone ?? "";
      return (
        contact.name.toLowerCase().includes(searchTerm) ||
        email.toLowerCase().includes(searchTerm) ||
        phone.toLowerCase().includes(searchTerm)
      );
    });
  }, [contactSearch, contactStatusFilter, contacts]);

  const sortedContacts = useMemo(() => {
    const items = [...filteredContacts];
    items.sort((current, next) => {
      const a = getContactSortValue(current, contactSortBy);
      const b = getContactSortValue(next, contactSortBy);
      const comparison = a.localeCompare(b);
      return contactSortDirection === "asc" ? comparison : -comparison;
    });
    return items;
  }, [filteredContacts, contactSortBy, contactSortDirection]);

  const contactTotalPages = Math.max(
    1,
    Math.ceil(sortedContacts.length / contactPageSize),
  );
  useEffect(() => {
    setContactPage((current) => Math.min(current, contactTotalPages));
  }, [contactTotalPages]);

  const contactPageButtons = useMemo(
    () => buildPageButtons(contactPage, contactTotalPages),
    [contactPage, contactTotalPages],
  );

  const visibleContacts = useMemo(() => {
    const startIndex = (contactPage - 1) * contactPageSize;
    return sortedContacts.slice(startIndex, startIndex + contactPageSize);
  }, [contactPage, contactPageSize, sortedContacts]);

  const contactPageCaption = useMemo(
    () =>
      t("hubgrid.itemsLabel", { count: Math.max(0, sortedContacts.length) }),
    [sortedContacts.length, t],
  );

  useEffect(() => {
    setContactPage(1);
  }, [
    contactStatusFilter,
    contactSearch,
    contactSortBy,
    contactSortDirection,
    contactPageSize,
  ]);

  const contactRowCells = useCallback(
    (contact: ContactItem) => [
      contact.name,
      contact.email ?? "-",
      contact.phone ?? "-",
    ],
    [],
  );

  const renderContactStatus = useCallback(
    (contact: ContactItem) => (
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
    ),
    [t],
  );

  const renderContactActions = useCallback(
    (contact: ContactItem) => (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => handleContactEdit(contact)}
          className="inline-flex h-8 w-8 items-center justify-center text-[#1f2f3f] transition-colors hover:text-[#0cbbf6] dark:border-[#38505d] dark:text-[#9eb1bc] dark:hover:text-white"
          title={t("clients.actions.edit")}
        >
          <SquarePen className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
        </button>
        <button
          type="button"
          onClick={() => void handleContactToggleStatus(contact)}
          className="inline-flex h-8 w-8 items-center justify-center transition-colors hover:text-[#0cbbf6] dark:border-[#38505d] dark:text-[#9eb1bc] dark:hover:text-white"
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
          onClick={() => void handleContactDelete(contact)}
          className="inline-flex h-8 w-8 items-center justify-center transition-colors hover:text-[#ffd7e1]"
          title={t("clients.actions.delete")}
        >
          <Trash2 className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
        </button>
      </div>
    ),
    [handleContactDelete, handleContactEdit, handleContactToggleStatus, t],
  );

  const handleContactSort = useCallback(
    (columnKey: string) => {
      const normalized = columnKey as ContactSortColumn;
      if (normalized === contactSortBy) {
        setContactSortDirection((current) =>
          current === "asc" ? "desc" : "asc",
        );
        return;
      }
      setContactSortDirection("asc");
      setContactSortBy(normalized);
    },
    [contactSortBy],
  );

  const addressColumns = useMemo<HubGridColumn<AddressItem>[]>(
    () => [
      {
        key: "Street",
        label: t("clients.addresses.table.street"),
      },
      {
        key: "City",
        label: t("clients.addresses.table.city"),
      },
      {
        key: "State",
        label: t("clients.addresses.table.state"),
      },
      {
        key: "PostalCode",
        label: t("clients.addresses.table.postalCode"),
      },
    ],
    [t],
  );

  const addressStatusFilterOptions = useMemo(
    () => [
      { value: "active", label: t("clients.filters.active") },
      { value: "inactive", label: t("clients.filters.inactive") },
      { value: "all", label: t("clients.filters.all") },
    ],
    [t],
  );

  const filteredAddresses = useMemo(() => {
    const searchTerm = addressSearch.trim().toLowerCase();
    return addresses.filter((address) => {
      if (addressStatusFilter !== "all") {
        const expected = addressStatusFilter === "active";
        if (address.isActive !== expected) {
          return false;
        }
      }
      if (!searchTerm) {
        return true;
      }
      const street = address.street ?? "";
      const city = address.city ?? "";
      return (
        street.toLowerCase().includes(searchTerm) ||
        city.toLowerCase().includes(searchTerm)
      );
    });
  }, [addressSearch, addressStatusFilter, addresses]);

  const sortedAddresses = useMemo(() => {
    const items = [...filteredAddresses];
    items.sort((current, next) => {
      const a = getAddressSortValue(current, addressSortBy);
      const b = getAddressSortValue(next, addressSortBy);
      const comparison = a.localeCompare(b);
      return addressSortDirection === "asc" ? comparison : -comparison;
    });
    return items;
  }, [addressSortBy, addressSortDirection, filteredAddresses]);

  const addressTotalPages = Math.max(
    1,
    Math.ceil(sortedAddresses.length / addressPageSize),
  );
  useEffect(() => {
    setAddressPage((current) => Math.min(current, addressTotalPages));
  }, [addressTotalPages]);

  const addressPageButtons = useMemo(
    () => buildPageButtons(addressPage, addressTotalPages),
    [addressPage, addressTotalPages],
  );

  const visibleAddresses = useMemo(() => {
    const startIndex = (addressPage - 1) * addressPageSize;
    return sortedAddresses.slice(startIndex, startIndex + addressPageSize);
  }, [addressPage, addressPageSize, sortedAddresses]);

  const addressPageCaption = useMemo(
    () =>
      t("hubgrid.itemsLabel", { count: Math.max(0, sortedAddresses.length) }),
    [sortedAddresses.length, t],
  );

  useEffect(() => {
    setAddressPage(1);
  }, [
    addressStatusFilter,
    addressSearch,
    addressSortBy,
    addressSortDirection,
    addressPageSize,
  ]);

  const addressRowCells = useCallback(
    (address: AddressItem) => [
      address.street ?? "-",
      address.city ?? "-",
      address.state ?? "-",
      address.postalCode ?? "-",
    ],
    [],
  );

  const renderAddressStatus = useCallback(
    (address: AddressItem) => (
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
    ),
    [t],
  );

  const renderAddressActions = useCallback(
    (address: AddressItem) => (
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
          onClick={() => void handleAddressToggleStatus(address)}
          className="inline-flex h-8 w-8 items-center justify-center transition-colors hover:text-[#0cbbf6] dark:border-[#38505d] dark:text-[#9eb1bc] dark:hover:text-white"
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
          onClick={() => void handleAddressDelete(address)}
          className="inline-flex h-8 w-8 items-center justify-center transition-colors hover:text-[#ffd7e1]"
          title={t("clients.actions.delete")}
        >
          <Trash2 className="h-4 w-4 text-[#3E515B] dark:text-[#84a0c0]" />
        </button>
      </div>
    ),
    [handleAddressDelete, handleAddressEdit, handleAddressToggleStatus, t],
  );

  const handleAddressSort = useCallback(
    (columnKey: string) => {
      const normalized = columnKey as AddressSortColumn;
      if (normalized === addressSortBy) {
        setAddressSortDirection((current) =>
          current === "asc" ? "desc" : "asc",
        );
        return;
      }
      setAddressSortDirection("asc");
      setAddressSortBy(normalized);
    },
    [addressSortBy],
  );

  const isEditing = Boolean(client?.id);

  return (
    <WorkspaceShell>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="gerit-calendar-scrollbar flex min-h-0 flex-1 flex-col overflow-auto bg-[#f5f6f8] px-4 py-4 sm:px-6 dark:bg-[#243143]">
          <div className="mb-6 flex items-center justify-between gap-4 rounded-sm border border-[#dfe6ed]/80 bg-white px-6 py-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:border-[#132131] dark:bg-[#0d161f]">
            <div>
              <h1 className="text-3xl font-semibold text-[#0f172a] dark:text-white">
                {isEditing
                  ? t("clients.form.editTitle")
                  : t("clients.form.newTitle")}
              </h1>
              <p className="mt-1 text-sm uppercase tracking-[0.3em] text-[#7aa4c0] dark:text-[#84a0c0]">
                {client
                  ? t("clients.form.subtitle")
                  : t("clients.detail.helper")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/operations/clients")}
                className="rounded-sm border border-[#c9d2e0] bg-white px-4 py-2 text-sm font-semibold text-[#1f2f3f] transition-colors hover:border-[#08aee5] hover:text-[#08aee5] dark:border-[#203040] dark:bg-[#0c1721] dark:text-[#8da7b4] dark:hover:border-[#08aee5] dark:hover:text-[#08aee5]"
              >
                {t("clients.actions.back")}
              </button>
              {client ? (
                <>
                  <span
                    className={clsx(
                      "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                      client.isActive
                        ? "text-[#3E515B] dark:text-[#84a0c0]"
                        : "text-[#3E515B] dark:text-[#84a0c0]",
                    )}
                  >
                    {client.isActive
                      ? t("clients.status.active")
                      : t("clients.status.inactive")}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleClientToggleStatus()}
                    className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#08aee5] bg-[#08aee5] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0cbbf6]"
                  >
                    <Power className="h-4 w-4" aria-hidden="true" />
                    {client.isActive
                      ? t("clients.actions.deactivate")
                      : t("clients.actions.activate")}
                  </button>
                </>
              ) : null}
              {loadingClient ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#08aee5]" />
              ) : null}
            </div>
          </div>

          <HubTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={[
              {
                id: "client",
                label: t("clients.detail.section.client"),
                helper: t("clients.detail.tabs.clientSummary"),
                panel: (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-2xl font-semibold text-[#0f172a] dark:text-[#d6e6ee]">
                          {client
                            ? t("clients.form.subtitle")
                            : t("clients.detail.helper")}{" "}
                        </h3>
                      </div>
                    </div>
                    <hr className="border-t border-[#c9d2e0] dark:border-[#38505d]" />
                    <form
                      className="space-y-6"
                      onSubmit={(event) => void handleClientSubmit(event)}
                    >
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                        <div className="flex-1 space-y-4">
                          <label className="block space-y-1">
                            <span className="text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                              {t("clients.form.name")}
                            </span>
                            <input
                              value={clientFormState.name}
                              onChange={(event) =>
                                setClientFormState((current) => ({
                                  ...current,
                                  name: event.target.value,
                                }))
                              }
                              className="h-12 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-sm text-[#6b7280] dark:text-[#b2c5cf]">
                              {t("clients.form.phone")}
                            </span>
                            <input
                              value={clientFormState.phone}
                              onChange={(event) =>
                                setClientFormState((current) => ({
                                  ...current,
                                  phone: event.target.value,
                                }))
                              }
                              className="h-12 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-sm font-semibold text-[#94a5b4] dark:text-[#8da7b4]">
                              {t("clients.form.clientType")}
                            </span>
                            <select
                              value={clientFormState.clientType}
                              onChange={(event) =>
                                setClientFormState((current) => ({
                                  ...current,
                                  clientType: event.target.value,
                                }))
                              }
                              className="h-12 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-xs text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                            >
                              <option value="">
                                {t("clients.form.selectOption")}
                              </option>
                              {CLIENT_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {t(option.labelKey)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block space-y-1">
                            <span className="text-sm font-semibold text-[#94a5b4] dark:text-[#8da7b4]">
                              {t("clients.form.origin")}
                            </span>
                            <select
                              value={clientFormState.origin}
                              onChange={(event) =>
                                setClientFormState((current) => ({
                                  ...current,
                                  origin: event.target.value,
                                }))
                              }
                              className="h-12 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-xs text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                            >
                              <option value="">
                                {t("clients.form.selectOption")}
                              </option>
                              {ORIGIN_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {t(option.labelKey)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block space-y-1">
                            <span className="text-sm font-semibold text-[#94a5b4] dark:text-[#8da7b4]">
                              {t("clients.form.email")}
                            </span>
                            <input
                              value={clientFormState.email}
                              onChange={(event) =>
                                setClientFormState((current) => ({
                                  ...current,
                                  email: event.target.value,
                                }))
                              }
                              className="h-12 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-sm font-semibold text-[#94a5b4] dark:text-[#8da7b4]">
                              {t("clients.form.website")}
                            </span>
                            <input
                              value={clientFormState.website}
                              onChange={(event) =>
                                setClientFormState((current) => ({
                                  ...current,
                                  website: event.target.value,
                                }))
                              }
                              className="h-12 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-sm font-semibold text-[#94a5b4] dark:text-[#8da7b4]">
                              {t("clients.form.score")}
                            </span>
                            <input
                              type="number"
                              value={clientFormState.score}
                              onChange={(event) =>
                                setClientFormState((current) => ({
                                  ...current,
                                  score: event.target.value,
                                }))
                              }
                              className="h-12 w-full rounded-md border border-[#c9d2e0] bg-white px-3 text-[0.75rem] text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-sm font-semibold text-[#94a5b4] dark:text-[#8da7b4]">
                              {t("clients.form.observation")}
                            </span>
                            <textarea
                              rows={2}
                              value={clientFormState.remarks}
                              onChange={(event) =>
                                setClientFormState((current) => ({
                                  ...current,
                                  remarks: event.target.value,
                                }))
                              }
                              className="w-full rounded-md border border-[#c9d2e0] bg-white px-3 py-2 text-sm text-[#1f2f3f] outline-none focus:border-[#11b7ff] dark:border-[#38505d] dark:bg-[#263844] dark:text-[#d6e6ee]"
                            />
                          </label>
                          <div className="flex flex-col gap-3">
                            <ToggleField
                              label={t("clients.form.consent")}
                              checked={clientFormState.consent}
                              onChange={(value) =>
                                setClientFormState((current) => ({
                                  ...current,
                                  consent: value,
                                }))
                              }
                              className="w-full"
                            />
                            <ToggleField
                              label={t("clients.status.active")}
                              checked={clientFormState.isActive}
                              onChange={(value) =>
                                setClientFormState((current) => ({
                                  ...current,
                                  isActive: value,
                                }))
                              }
                              className="w-full"
                            />
                          </div>
                        </div>
                        <div className="hidden lg:block w-px bg-[#1e2f45]" />
                        <div className="flex w-full max-w-[360px] flex-col gap-4">
                          <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-[#34425a] bg-[#0f1a27] p-5 text-center text-sm font-semibold uppercase tracking-[0.3em] text-[#96a7be]">
                            {client?.urlImage ? (
                              <img
                                src={client.urlImage}
                                alt={client.name}
                                className="max-h-full w-full rounded-md object-cover"
                              />
                            ) : (
                              <span className="text-xs uppercase tracking-[0.3em]">
                                {t("clients.detail.item.image")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingClient}
                          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#08aee5] px-4 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {submittingClient ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : null}
                          {t("clients.actions.save")}
                        </button>
                      </div>
                    </form>
                  </div>
                ),
              },
              {
                id: "contacts",
                label: t("clients.contacts.title"),
                helper: t("clients.detail.tabs.contactsSummary"),
                panel: (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-2xl font-semibold text-[#0f172a] dark:text-[#d6e6ee]">
                          {t("clients.contacts.subtitle")}
                        </h3>
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
                            disabled={!client || contactsBulkUploading}
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              void handleContactsBulkUpload(file);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <hr className="border-t border-[#c9d2e0] dark:border-[#38505d]" />
                    <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
                      <div className="flex-1 space-y-4">
                        <div className="rounded-sm border border-[#cbd5e1] bg-[#f9fbff] p-4 dark:border-[#1c2c3a] dark:bg-[#101827]">
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#94a5b4] dark:text-[#8da7b4]">
                            {t("clients.detail.item.primaryContact")}
                          </p>
                          {primaryContact ? (
                            <div className="mt-3 space-y-2 text-sm text-[#163047] dark:text-[#d6e6ee]">
                              <p>
                                <strong className="text-[#1f2c3e] dark:text-white">
                                  {t("clients.contacts.form.name")}:{" "}
                                </strong>
                                {primaryContact.name}
                              </p>
                              <p className="text-[#475569] dark:text-[#9eb1bc]">
                                <strong className="text-[#1f2c3e] dark:text-white">
                                  {t("clients.contacts.form.email")}:{" "}
                                </strong>
                                {primaryContact.email ?? "-"}
                              </p>
                              <p className="text-[#475569] dark:text-[#9eb1bc]">
                                <strong className="text-[#1f2c3e] dark:text-white">
                                  {t("clients.contacts.form.phone")}:{" "}
                                </strong>
                                {primaryContact.phone ?? "-"}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-[#4f5c6a] dark:text-[#9eb1bc]">
                              {t("clients.contacts.empty")}
                            </p>
                          )}
                        </div>
                        <HubGrid
                          columns={contactColumns}
                          items={visibleContacts}
                          renderRowCells={contactRowCells}
                          renderStatus={renderContactStatus}
                          statusColumnLabel={t("clients.table.status")}
                          renderActions={renderContactActions}
                          actionsColumnLabel={t(
                            "clients.contacts.table.actions",
                          )}
                          rowDensity={contactGridDensity}
                          densityOptions={gridDensityOptions}
                          onDensityChange={setContactGridDensity}
                          sortBy={contactSortBy}
                          sortDirection={contactSortDirection}
                          onSort={handleContactSort}
                          statusFilter={contactStatusFilter}
                          statusFilterOptions={contactStatusFilterOptions}
                          onStatusFilterChange={setContactStatusFilter}
                          statusFilterLabel={t("clients.filters.statusLabel")}
                          searchValue={contactSearch}
                          onSearchChange={setContactSearch}
                          searchPlaceholder={t("clients.filters.search")}
                          loading={contactsLoading}
                          loadingText={t("clients.loading")}
                          emptyText={t("clients.contacts.empty")}
                          pageCaption={contactPageCaption}
                          page={contactPage}
                          totalPages={contactTotalPages}
                          pageButtons={contactPageButtons}
                          onPageChange={setContactPage}
                          pageSize={contactPageSize}
                          pageSizeOptions={CONTACT_GRID_PAGE_SIZE_OPTIONS}
                          onPageSizeChange={setContactPageSize}
                          paginationPreviousLabel={t(
                            "clients.pagination.previous",
                          )}
                          paginationNextLabel={t("clients.pagination.next")}
                          paginationPageLabel={t("clients.pagination.page")}
                          paginationPerPageLabel={t(
                            "clients.pagination.perPage",
                          )}
                          getRowKey={(contact) => contact.id}
                          onRowClick={handleContactEdit}
                        />
                      </div>
                      <div className="hidden lg:block w-px bg-[#1e2f45]" />
                      <div className="w-full lg:w-[360px] space-y-4">
                        <form
                          className="space-y-3"
                          onSubmit={(event) => void handleContactSubmit(event)}
                        >
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
                              disabled={!client}
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
                              disabled={!client}
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
                              disabled={!client}
                            />
                          </label>
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
                              disabled={!client || contactSubmitting}
                              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#08aee5] px-4 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              {contactSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : null}
                              {t("clients.actions.save")}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                id: "addresses",
                label: t("clients.addresses.title"),
                helper: t("clients.detail.tabs.addressesSummary"),
                panel: (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-2xl font-semibold text-[#0f172a] dark:text-[#d6e6ee]">
                          {t("clients.addresses.subtitle")}
                        </h3>
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
                            disabled={!client || addressesBulkUploading}
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              void handleAddressesBulkUpload(file);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <hr className="border-t border-[#c9d2e0] dark:border-[#38505d]" />
                    <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start">
                      <div className="flex-1 space-y-4">
                        <div className="rounded-sm border border-[#cbd5e1] bg-[#f9fbff] p-4 dark:border-[#1c2c3a] dark:bg-[#101827]">
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#94a5b4] dark:text-[#8da7b4]">
                            {t("clients.detail.item.primaryAddress")}
                          </p>
                          {primaryAddress ? (
                            <div className="mt-3 space-y-2 text-sm text-[#163047] dark:text-[#d6e6ee]">
                              <p>
                                <strong className="text-[#1f2c3e] dark:text-white">
                                  {t("clients.addresses.form.street")}:{" "}
                                </strong>
                                {primaryAddress.street ?? "-"}
                              </p>
                              <p className="text-[#475569] dark:text-[#9eb1bc]">
                                <strong className="text-[#1f2c3e] dark:text-white">
                                  {t("clients.addresses.form.city")}:{" "}
                                </strong>
                                {primaryAddress.city ?? "-"}
                              </p>
                              <p className="text-[#475569] dark:text-[#9eb1bc]">
                                <strong className="text-[#1f2c3e] dark:text-white">
                                  {t("clients.addresses.form.state")}:{" "}
                                </strong>
                                {primaryAddress.state ?? "-"}
                              </p>
                              <p className="text-[#475569] dark:text-[#9eb1bc]">
                                <strong className="text-[#1f2c3e] dark:text-white">
                                  {t("clients.addresses.form.postalCode")}:{" "}
                                </strong>
                                {primaryAddress.postalCode ?? "-"}
                              </p>
                              <p className="text-[#475569] dark:text-[#9eb1bc]">
                                <strong className="text-[#1f2c3e] dark:text-white">
                                  {t("clients.addresses.form.country")}:{" "}
                                </strong>
                                {primaryAddress.country ?? "-"}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-[#4f5c6a] dark:text-[#9eb1bc]">
                              {t("clients.addresses.empty")}
                            </p>
                          )}
                        </div>
                        <HubGrid
                          columns={addressColumns}
                          items={visibleAddresses}
                          renderRowCells={addressRowCells}
                          renderStatus={renderAddressStatus}
                          statusColumnLabel={t("clients.table.status")}
                          renderActions={renderAddressActions}
                          actionsColumnLabel={t(
                            "clients.addresses.table.actions",
                          )}
                          rowDensity={addressGridDensity}
                          densityOptions={gridDensityOptions}
                          onDensityChange={setAddressGridDensity}
                          sortBy={addressSortBy}
                          sortDirection={addressSortDirection}
                          onSort={handleAddressSort}
                          statusFilter={addressStatusFilter}
                          statusFilterOptions={addressStatusFilterOptions}
                          onStatusFilterChange={setAddressStatusFilter}
                          statusFilterLabel={t("clients.filters.statusLabel")}
                          searchValue={addressSearch}
                          onSearchChange={setAddressSearch}
                          searchPlaceholder={t("clients.filters.search")}
                          loading={addressesLoading}
                          loadingText={t("clients.loading")}
                          emptyText={t("clients.addresses.empty")}
                          pageCaption={addressPageCaption}
                          page={addressPage}
                          totalPages={addressTotalPages}
                          pageButtons={addressPageButtons}
                          onPageChange={setAddressPage}
                          pageSize={addressPageSize}
                          pageSizeOptions={ADDRESS_GRID_PAGE_SIZE_OPTIONS}
                          onPageSizeChange={setAddressPageSize}
                          paginationPreviousLabel={t(
                            "clients.pagination.previous",
                          )}
                          paginationNextLabel={t("clients.pagination.next")}
                          paginationPageLabel={t("clients.pagination.page")}
                          paginationPerPageLabel={t(
                            "clients.pagination.perPage",
                          )}
                          getRowKey={(address) => address.id}
                          onRowClick={handleAddressEdit}
                        />
                      </div>
                      <div className="hidden lg:block w-px bg-[#1e2f45]" />
                      <div className="w-full lg:w-[360px] space-y-4">
                        <div className="rounded-sm border border-[#cbd5e1] bg-[#f9fbff] p-4 dark:border-[#1c2c3a] dark:bg-[#101827]">
                          <form
                            className="space-y-4"
                            onSubmit={(event) =>
                              void handleAddressSubmit(event)
                            }
                          >
                            <label className="block space-y-1">
                              <span className="text-sm text-[#6b7280] dark:text-[#b2c5cf]">
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
                                disabled={!client}
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-sm text-[#6b7280] dark:text-[#b2c5cf]">
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
                                disabled={!client}
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-sm text-[#6b7280] dark:text-[#b2c5cf]">
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
                                disabled={!client}
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-sm text-[#6b7280] dark:text-[#b2c5cf]">
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
                                disabled={!client}
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-sm text-[#6b7280] dark:text-[#b2c5cf]">
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
                                disabled={!client}
                              />
                            </label>
                            <div className="flex justify-end gap-2">
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
                                disabled={!client || addressSubmitting}
                                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#08aee5] px-4 text-sm font-semibold text-white disabled:opacity-60"
                              >
                                {addressSubmitting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                {t("clients.actions.save")}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </WorkspaceShell>
  );
}
