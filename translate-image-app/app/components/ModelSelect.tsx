// src/components/ModelSelect.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Model = {
  value: string;
  label: string;
  icon: string;        // 主图标（如 🫘 或 🌋）
  description: string; // 副标题描述
  tag?: string;        // 可选标签，如 "推荐"、"New"、"图片编辑"
  tagVariant?: "default" | "secondary" | "destructive" | "outline";
};

type ModelSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  models: Model[];
};

export function ModelSelect({ value, onValueChange, models }: ModelSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedModel = models.find((m) => m.value === value);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium whitespace-nowrap">AI模型</span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-64 justify-between font-normal h-12"
          >
            <div className="flex items-center gap-3 truncate">
              {selectedModel && (
                <>
                  <span className="text-2xl">{selectedModel.icon}</span>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{selectedModel.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedModel.description}
                    </span>
                  </div>
                </>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-96 p-0" side="bottom" align="start" sideOffset={4}>
          <Command>
            {/* 隐藏搜索框，实现无搜索效果 */}
            <div className="h-1" /> {/* 占位，避免 CommandEmpty 直接显示 */}
            <CommandList>
              <CommandEmpty>无模型</CommandEmpty>
              <CommandGroup>
                {models.map((model) => (
                  <CommandItem
                    key={model.value}
                    value={model.value}
                    onSelect={() => {
                      onValueChange(model.value);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-3 h-5 w-5",
                        value === model.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-3xl">{model.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{model.label}</span>
                          {model.tag && (
                            <Badge variant={model.tagVariant || "secondary"} className="text-xs">
                              {model.tag}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {model.description}
                        </p>
                      </div>
                    </div>
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