import { cn } from "./lib/utils";
import { format } from "date-fns";

export function classNames(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
