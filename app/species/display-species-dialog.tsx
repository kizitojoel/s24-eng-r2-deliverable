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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState, type BaseSyntheticEvent } from "react";

// For part 2
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Define kingdom enum for use in Zod schema and displaying dropdown options in the form
const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

// Use Zod to define the shape + requirements of a Species entry; used in form validation
const speciesSchema = z.object({
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val?.trim()),
  common_name: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  kingdom: kingdoms,
  total_population: z.number().int().positive().min(1).nullable(),
  image: z
    .string()
    .url()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  description: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

type FormData = z.infer<typeof speciesSchema>;

// Default values for the form fields.
/* Because the react-hook-form (RHF) used here is a controlled form (not an uncontrolled form),
fields that are nullable/not required should explicitly be set to `null` by default.
Otherwise, they will be `undefined` by default, which will raise warnings because `undefined` conflicts with controlled components.
All form fields should be set to non-undefined default values.
Read more here: https://legacy.react-hook-form.com/api/useform/
*/

type Species = Database["public"]["Tables"]["species"]["Row"];

export default function DisplaySpeciesDialog({ species, userId }: { species: Species; userId: string }) {
  // Control open/closed state of the dialog
  const [open, setOpen] = useState<boolean>(false);

  // State variable to track toggleable editing mode of form
  const [isEditing, setIsEditing] = useState(false);

  const startEditing = () => {
    setIsEditing(true);
    console.log("Started editing");
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset(defaultValues);
    console.log("Force close");
  };

  const defaultValues: Partial<FormData> = {
    scientific_name: species.scientific_name,
    common_name: species.common_name,
    kingdom: species.kingdom,
    total_population: species.total_population,
    image: species.image,
    description: species.description,
  };

  const deleteSpecies = async () => {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("species").delete().eq("id", species.id);

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    toast({
      title: "Successfully Deleted Species!",
      description: "Successfully deleted " + species.scientific_name + ".",
    });

    router.refresh();
  };

  const router = useRouter();

  // Instantiate form functionality with React Hook Form, passing in the Zod schema (for validation) and default values
  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues,
    mode: "onChange",
  });

  const onsubmit = async (input: FormData) => {
    console.log("Submitting form with input:");
    // The `input` prop contains data that has already been processed by zod. We can now use it in a supabase query
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("species")
      .update({
        common_name: input.common_name,
        description: input.description,
        kingdom: input.kingdom,
        scientific_name: input.scientific_name,
        total_population: input.total_population,
        image: input.image,
      })
      .eq("id", species.id);

    // Catch and report errors from Supabase and exit the onsubmit function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Because Supabase errors were caught above, the remainder of the function will only execute upon a successful edit

    // Reset form values to the default (empty) values.
    // Practically, this line can be removed because router.refresh() also resets the form. However, we left it as a reminder that you should generally consider form "cleanup" after an add/edit operation.
    form.reset(defaultValues);

    // Refresh all server components in the current route. This helps display the newly created species because species are fetched in a server component, species/page.tsx.
    // Refreshing that server component will display the new species from Supabase
    router.refresh();

    return toast({
      title: "Successfully Edited Species!",
      description: "Successfully edited " + input.scientific_name + ".",
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="mt-3 w-full">Learn More</Button>
        </DialogTrigger>
        <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
          {/* {!isEditing && (
            <>
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
                <Button type="button" className="ml-1 mr-1 flex-auto" variant="secondary" onClick={startEditing}>
                  Edit Species
                </Button>

                <DialogClose asChild>
                  <Button type="button" className="ml-1 mr-1 flex-auto" variant="secondary">
                    Close
                  </Button>
                </DialogClose>
              </div>
            </>
          )} */}
          {true && (
            <Form {...form}>
              <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onsubmit)(e)}>
                <div className="grid w-full items-center gap-4">
                  <FormField
                    control={form.control}
                    name="scientific_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scientific Name</FormLabel>
                        <FormControl>
                          <Input readOnly={!isEditing} placeholder="Cavia porcellus" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="common_name"
                    render={({ field }) => {
                      // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                      const { value, ...rest } = field;
                      return (
                        <FormItem>
                          <FormLabel>Common Name</FormLabel>
                          <FormControl>
                            <Input readOnly={!isEditing} value={value ?? ""} placeholder="Guinea pig" {...rest} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="kingdom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kingdom</FormLabel>
                        <Select
                          disabled={!isEditing}
                          onValueChange={(value) => field.onChange(kingdoms.parse(value))}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a kingdom" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              {kingdoms.options.map((kingdom, index) => (
                                <SelectItem key={index} value={kingdom}>
                                  {kingdom}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="total_population"
                    render={({ field }) => {
                      const { value, ...rest } = field;
                      return (
                        <FormItem>
                          <FormLabel>Total population</FormLabel>
                          <FormControl>
                            {/* Using shadcn/ui form with number: https://github.com/shadcn-ui/ui/issues/421 */}
                            <Input
                              readOnly={!isEditing}
                              type="number"
                              value={value ?? ""}
                              placeholder="300000"
                              {...rest}
                              onChange={(event) => field.onChange(+event.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => {
                      // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                      const { value, ...rest } = field;
                      return (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input
                              readOnly={!isEditing}
                              value={value ?? ""}
                              placeholder="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/George_the_amazing_guinea_pig.jpg/440px-George_the_amazing_guinea_pig.jpg"
                              {...rest}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => {
                      // We must extract value from field and convert a potential defaultValue of `null` to "" because textareas can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                      const { value, ...rest } = field;
                      return (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              readOnly={!isEditing}
                              value={value ?? ""}
                              placeholder="The guinea pig or domestic guinea pig, also known as the cavy or domestic cavy, is a species of rodent belonging to the genus Cavia in the family Caviidae."
                              {...rest}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
                {/* ... rest of the form fields */}
                <div className="mt-6 flex">
                  {/* Conditionally render action buttons depending on if the form is in viewing/editing mode */}
                  {isEditing ? (
                    <>
                      <Button type="submit" className="mr-2">
                        Update profile
                      </Button>
                      <Button variant="secondary" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </>
                  ) : userId === species.author ? (
                    <div style={{ display: "flex", justifyContent: "space-around", width: "100%" }}>
                      <Button onClick={startEditing}>Edit Profile</Button>
                      <Button onClick={() => void deleteSpecies()}>Delete Species</Button>
                    </div>
                  ) : null}
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
