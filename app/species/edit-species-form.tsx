"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { type Database } from "@/lib/schema";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent, type MouseEvent } from "react";

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

type Species = Database["public"]["Tables"]["species"]["Row"];

export default function EditSpeciesForm({ species }: { species: Species }) {
  // State variable to track toggleable editing mode of form
  const [isEditing, setIsEditing] = useState(false);

  // Set default values for the form (on open) to the existing profile data which was passed in as a prop
  const defaultValues: Partial<FormData> = {
    scientific_name: species.scientific_name,
    common_name: species.common_name,
    kingdom: species.kingdom,
    total_population: species.total_population,
    image: species.image,
    description: species.description,
  };

  type FormData = z.infer<typeof speciesSchema>;

  // Instantiate form functionality with React Hook Form, passing in the Zod schema (for validation) and default values
  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues,
    mode: "onChange",
  });

  const router = useRouter();

  const onSubmit = async (input: FormData) => {
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

    // Catch and report errors from Supabase and exit the onSubmit function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Because Supabase errors were caught above, the remainder of the function will only execute upon a successful edit

    setIsEditing(false);

    // Reset form values to the data values that have been processed by zod.
    // This is helpful to do after EDITING, so that the user sees any changes that have occurred during transformation
    form.reset(input);

    // Router.refresh does not affect ProfileForm because it is a client component, but it will refresh the initials in the user-nav in the event of a username change
    router.refresh();

    return toast({
      title: "Species edited successfully",
      description: "Successfully edited " + input.scientific_name + ".",
    });
  };

  const startEditing = (e: MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
  };

  const handleCancel = (e: MouseEvent) => {
    e.preventDefault();
    // If edit canceled, reset the form data to the original values which were set from props
    form.reset(defaultValues);
    // Turn off editing mode
    setIsEditing(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
        <div className="grid w-full items-center gap-4">
          <FormField
            control={form.control}
            name="scientific_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scientific Name</FormLabel>
                <FormControl>
                  <Input placeholder="Cavia porcellus" {...field} />
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
                    <Input value={value ?? ""} placeholder="Guinea pig" {...rest} />
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
                <Select onValueChange={(value) => field.onChange(kingdoms.parse(value))} value={field.value}>
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
        <div className="flex">
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
          ) : (
            // Toggle editing mode
            <Button onClick={startEditing}>Edit Profile</Button>
          )}
        </div>
      </form>
    </Form>
  );
}
