// src/components/ui/CustomSelect.jsx
//
// Replaces native <select> where the open dropdown list itself needs to be
// styled. This is NOT the shadcn CLI (which correctly failed on CRA earlier
// tonight) — @radix-ui/react-select is a plain npm package, installs and
// works fine under Create React App with zero build-tool requirements.
//
// Install first:
//   npm install @radix-ui/react-select
//
// Usage (drop-in replacement for the native <select> in SessionSetup.js):
//   <CustomSelect
//     value={role}
//     onChange={setRole}
//     options={ROLES}
//   />

import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";

export default function CustomSelect({ value, onChange, options }) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        className="w-full flex items-center justify-between bg-[#0A0A0A] border border-white/10 rounded-xl py-4 pl-4 pr-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer shadow-inner"
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon>
          <ChevronDown size={16} className="text-slate-500" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        {/* This is the part native <select> could never let you style —
            full control over the popup: border, radius, blur, spacing,
            hover states, all real CSS. */}
        <SelectPrimitive.Content
          className="overflow-hidden bg-[#0A0A0A] border border-white/10 rounded-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] z-50"
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport className="p-1.5">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt}
                value={opt}
                className="relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-300 cursor-pointer outline-none data-[highlighted]:bg-blue-500/10 data-[highlighted]:text-blue-200 data-[state=checked]:text-blue-400"
              >
                <SelectPrimitive.ItemText>{opt}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check size={14} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}