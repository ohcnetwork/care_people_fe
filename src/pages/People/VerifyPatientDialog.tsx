import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface VerifyPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the confirmed 4-digit year of birth. */
  onVerify: (yearOfBirth: string) => void;
}

/**
 * Port of care_fe's identity-verification dialog (`PatientIndex`).
 *
 * A facility-scoped search may return *partial* patient records — records
 * the caller is not yet authorised to see in full. The backend requires the
 * patient's year of birth as a second factor before it will resolve one.
 * This dialog only collects that value; resolution itself is done by
 * care_fe's `PatientHome` via `POST /api/v1/patient/search_retrieve/`.
 */
export default function VerifyPatientDialog({
  open,
  onOpenChange,
  onVerify,
}: VerifyPatientDialogProps) {
  const { t } = useTranslation();
  const [yearOfBirth, setYearOfBirth] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setYearOfBirth("");
    }
    onOpenChange(nextOpen);
  };

  const handleVerify = () => {
    if (yearOfBirth.length !== 4) {
      toast.error(t("valid_year_of_birth"));
      return;
    }
    onVerify(yearOfBirth);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("verify_patient_identity")}</DialogTitle>
          <DialogDescription>
            {t("patient_birth_year_for_identity")}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="text"
            inputMode="numeric"
            placeholder={`${t("year_of_birth")} (YYYY)`}
            value={yearOfBirth}
            onChange={(e) => {
              const value = e.target.value;
              if (/^\d{0,4}$/.test(value)) {
                setYearOfBirth(value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleVerify();
              }
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleVerify}>{t("verify")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
