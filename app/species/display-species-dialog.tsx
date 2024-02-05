"use client";
/*
Note: "use client" is a Next.js App Router directive that tells React to render the component as
a client component rather than a server component. This establishes the server-client boundary,
providing access to client-side functionality such as hooks and event handlers to this component and
any of its imported children. Although the SpeciesCard component itself does not use any client-side
functionality, it is beneficial to move it to the client because it is rendered in a list with a unique
key prop in species/page.tsx. When multiple component instances are rendered from a list, React uses the unique key prop
on the client-side to correctly match component state and props should the order of the list ever change.
React server components don't track state between rerenders, so leaving the uniquely identified components (e.g. SpeciesCard)
can cause errors with matching props and state in child components if the list order changes.
*/
import type { Database } from "@/lib/schema";
// Importing everything for my dialog to work
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-separator";
import { useState } from "react";

type Species = Database["public"]["Tables"]["species"]["Row"];

export default function DisplaySpeciesDialog({ species }: { species: Species }) {
  // Control open/closed state of the dialog
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mt-3 w-full">Learn More</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Species Information</DialogTitle>
          <DialogDescription>Information about species.</DialogDescription>
        </DialogHeader>

        <div>
          <Label>Scientific Name</Label>
          <Separator></Separator>
          {species.scientific_name}
        </div>
        <div>
          <Label>Common Name</Label>
          <Separator></Separator>
          {species.common_name}
        </div>
        <div>
          <Label>Total Population</Label>
          <Separator></Separator>
          {species.total_population}
        </div>
        <div>
          <Label>Kingdom</Label>
          <Separator></Separator>
          {species.kingdom}
        </div>
        <div>
          <Label>Description</Label>
          <Separator></Separator>
          {species.description}
        </div>

        <div className="flex">
          <DialogClose asChild>
            <Button type="button" className="ml-1 mr-1 flex-auto" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
