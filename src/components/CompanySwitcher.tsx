import { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase-init';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Company {
  id: string;
  name: string;
}

interface CompanySwitcherProps {
  collapsed?: boolean;
}

export const CompanySwitcher = ({ collapsed = false }: CompanySwitcherProps) => {
  const { memberships, currentCompanyId, setCurrentCompanyId } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (memberships.length === 0) {
      setCompanies([]);
      return;
    }
    const ids = memberships.map((m) => m.company_id);
    supabase
      .from('companies')
      .select('id, name')
      .in('id', ids)
      .then(({ data }) => {
        if (data) setCompanies(data);
      });
  }, [memberships]);

  const currentCompany = companies.find((c) => c.id === currentCompanyId);
  const isMulti = memberships.length > 1;

  // ── No memberships ──────────────────────────────────────────────────────────
  if (memberships.length === 0) {
    if (collapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-center py-1.5 w-full">
                <Building2 className="w-4 h-4 text-muted-foreground/40" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Sin empresa</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-muted-foreground/50">
        <Building2 className="w-4 h-4 shrink-0" />
        <span className="text-xs">Sin empresa asignada</span>
      </div>
    );
  }

  // ── Single company — static indicator ───────────────────────────────────────
  if (!isMulti) {
    if (collapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-center py-1.5 w-full">
                <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center">
                  <Building2 className="w-3 h-3 text-primary" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{currentCompany?.name ?? '...'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
        <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center shrink-0">
          <Building2 className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs font-medium text-foreground truncate flex-1">
          {currentCompany?.name ?? '...'}
        </span>
      </div>
    );
  }

  // ── Multiple companies — dropdown switcher ───────────────────────────────────
  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex justify-center w-full py-1.5 rounded-md hover:bg-sidebar-accent transition-colors">
            <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center">
              <Building2 className="w-3 h-3 text-primary" />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={6} className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">
            Cambiar empresa activa
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onClick={() => setCurrentCompanyId(company.id)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                {currentCompanyId === company.id && <Check className="w-3.5 h-3.5 text-primary" />}
              </div>
              <span className="text-sm truncate">{company.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-left group">
          <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center shrink-0">
            <Building2 className="w-3 h-3 text-primary" />
          </div>
          <span className="text-xs font-medium text-foreground truncate flex-1">
            {currentCompany?.name ?? '...'}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={6} className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">
          Cambiar empresa activa
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => setCurrentCompanyId(company.id)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-4 h-4 shrink-0 flex items-center justify-center">
              {currentCompanyId === company.id && <Check className="w-3.5 h-3.5 text-primary" />}
            </div>
            <span className="text-sm truncate">{company.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
