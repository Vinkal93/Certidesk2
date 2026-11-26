"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { contactFormSchema, type ContactFormValues } from "@/validation/contact";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const instituteTypeOptions = [
  { label: "Coaching Center", value: "coaching" },
  { label: "Vocational / Skill Institute", value: "vocational" },
  { label: "Computer Training Academy", value: "computer_training" },
  { label: "School / College Department", value: "school_college" },
  { label: "Multi-Branch Institute Network", value: "multi_branch" },
];

const studentCountOptions = [
  { label: "Under 100 students", value: "under_100" },
  { label: "100 – 500 students", value: "100_500" },
  { label: "500 – 2,000 students", value: "500_2000" },
  { label: "2,000+ students", value: "above_2000" },
];

export function ContactForm() {
  const [submittedData, setSubmittedData] = React.useState<ContactFormValues | null>(
    null
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      instituteName: "",
      instituteType: "coaching",
      studentCount: "100_500",
      message: "",
      agreeToPolicy: false,
    },
  });

  const onSubmit = (data: ContactFormValues) => {
    setSubmittedData(data);
  };

  if (submittedData) {
    return (
      <Card elevated>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="bg-success-soft text-success mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-foreground text-xl font-semibold">
            Inquiry Prepared for {submittedData.instituteName}
          </h3>
          <p className="text-muted mt-2 max-w-md text-sm">
            Thank you, {submittedData.fullName}. Your inquiry details have been validated
            for {submittedData.email}. Backend submission endpoints will be connected in
            the next phase.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => {
              setSubmittedData(null);
              reset();
            }}
          >
            Submit another inquiry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevated>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Full Name"
              placeholder="e.g. Aarav Mehta"
              required
              error={errors.fullName?.message}
              {...register("fullName")}
            />
            <Input
              label="Work or Institute Email"
              type="email"
              placeholder="admin@institute.edu"
              required
              error={errors.email?.message}
              {...register("email")}
            />
          </div>

          <Input
            label="Institute Name"
            placeholder="e.g. Horizon Skill Academy"
            required
            error={errors.instituteName?.message}
            {...register("instituteName")}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select
              label="Institute Category"
              options={instituteTypeOptions}
              required
              error={errors.instituteType?.message}
              {...register("instituteType")}
            />
            <Select
              label="Active Student Strength"
              options={studentCountOptions}
              required
              error={errors.studentCount?.message}
              {...register("studentCount")}
            />
          </div>

          <Textarea
            label="How can we help?"
            placeholder="Tell us about your batches, fee workflows, examination setup, or certificate requirements..."
            required
            error={errors.message?.message}
            {...register("message")}
          />

          <Checkbox
            label="I agree to the Privacy Policy and Terms of Service."
            error={errors.agreeToPolicy?.message}
            {...register("agreeToPolicy")}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isSubmitting}
            rightIcon={<Send className="h-4 w-4" aria-hidden="true" />}
          >
            Send Inquiry
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
