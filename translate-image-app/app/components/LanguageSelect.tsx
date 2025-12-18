// src/components/LanguageSelect.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Language = {
  value: string;
  label: string;
  flag?: string;
};

type LanguageSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  languages: Language[];
  placeholder?: string;
  triggerLabel?: string; // 如 "源语言" 或 "目标语言"
};

export function LanguageSelect({
  value,
  onValueChange,
  languages,
  placeholder = "选择语言",
  triggerLabel,
}: LanguageSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLanguage = languages.find((lang) => lang.value === value);

  return (
    <div className="flex items-center gap-3">
      {triggerLabel && <span className="text-sm font-medium whitespace-nowrap">{triggerLabel}</span>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-56 justify-between font-normal"
          >
            <span className="truncate">
              {selectedLanguage ? (
                <>
                  {selectedLanguage.flag && <span className="mr-2">{selectedLanguage.flag}</span>}
                  {selectedLanguage.label}
                </>
              ) : (
                placeholder
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0">
          <Command>
            <CommandInput placeholder="搜索语言..." className="h-9" />
            <CommandList>
              <CommandEmpty>未找到语言</CommandEmpty>
              <CommandGroup>
                {languages.map((language) => (
                  <CommandItem
                    key={language.value}
                    value={language.label} // 用 label 搜索，更自然
                    onSelect={() => {
                      onValueChange(language.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === language.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {/* {language.flag && <span className="mr-2">{language.flag}</span>} */}
                    {language.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}