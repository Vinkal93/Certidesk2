"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  onboardingRequestSchema,
  type OnboardingRequestValues,
} from "@/validation/contact";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const branchOptions = [
  { label: "Single Campus / Branch", value: "1" },
  { label: "2 – 5 Branches", value: "2_5" },
  { label: "6+ Branches", value: "6_plus" },
];

const focusOptions = [
  { label: "Full Institute Suite", value: "full_suite" },
  { label: "Student Admissions & Fee Management", value: "admissions_fees" },
  { label: "Attendance & Examination Records", value: "attendance_exams" },
  { label: "Marksheets & Certificate Issuance", value: "certificates_marksheets" },
];

export function OnboardingForm() {
  const [submitted, setSubmitted] = React.useState<OnboardingRequestValues | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingRequestValues>({
    resolver: zodResolver(onboardingRequestSchema),
    defaultValues: {
      adminName: "",
      adminEmail: "",
      instituteName: "",
      branchesCount: "1",
      primaryFocus: "full_suite",
    },
  });

  const onSubmit = (data: OnboardingRequestValues) => {
    setSubmitted(data);
  };

  if (submitted) {
    return (
      <Card elevated>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="bg-success-soft text-success mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-foreground text-xl font-semibold">
            Workspace Request Validated
          </h3>
          <p className="text-muted mt-2 max-w-md text-sm">
            We&apos;ve recorded your onboarding preferences for{" "}
            <span className="text-foreground font-medium">{submitted.instituteName}</span>
            . Account provisioning and portal authentication will be enabled in the
            upcoming platform phase.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => {
              setSubmitted(null);
              reset();
            }}
          >
            Edit request details
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevated>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Input
            label="Institute Name"
            placeholder="e.g. Apex Technical Institute"
            required
            error={errors.instituteName?.message}
            {...register("instituteName")}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Administrator Name"
              placeholder="e.g. Priya Sharma"
              required
              error={errors.adminName?.message}
              {...register("adminName")}
            />
            <Input
              label="Administrator Email"
              type="email"
              placeholder="director@institute.edu"
              required
              error={errors.adminEmail?.message}
              {...register("adminEmail")}
            />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select
              label="Number of Branches"
              options={branchOptions}
              required
              error={errors.branchesCount?.message}
              {...register("branchesCount")}
            />
            <Select
              label="Primary Operational Focus"
              options={focusOptions}
              required
              error={errors.primaryFocus?.message}
              {...register("primaryFocus")}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isSubmitting}
            rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          >
            Request Workspace Setup
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
