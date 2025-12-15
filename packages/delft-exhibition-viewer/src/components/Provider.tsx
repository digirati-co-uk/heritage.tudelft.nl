import type { Vault } from "@iiif/helpers";
import type { Manifest } from "@iiif/presentation-3";
import { LanguageProvider, ManifestContext, VaultProvider, useExistingVault, useManifest } from "react-iiif-vault";

export type ProviderProps = {
  manifest: Manifest | string;
  language?: string;
  children: React.ReactNode;
  loading?: React.ReactNode;
  customVault?: Vault;
  skipLoadManifest?: boolean;
};

export function Provider(props: ProviderProps) {
  const vault = useExistingVault(props.customVault);
  const manifestId = typeof props.manifest === "string" ? props.manifest : props.manifest.id;

  // Load manifest into vault, if passed in full object.
  if (!vault.requestStatus(manifestId) && !props.skipLoadManifest) {
    if (typeof props.manifest === "string") {
      // Then we remote load it.
      vault.loadManifest(props.manifest);
    } else {
      vault.loadSync(props.manifest.id, JSON.parse(JSON.stringify(props.manifest)));
    }
  }

  return (
    <VaultProvider vault={vault}>
      <ManifestContext manifest={manifestId}>
        <LanguageProvider language={props.language || "en"}>
          <WaitForManifest loading={props.loading}>{props.children as any}</WaitForManifest>
        </LanguageProvider>
      </ManifestContext>
    </VaultProvider>
  );
}

function WaitForManifest(props: { loading: React.ReactNode; children: React.ReactNode }) {
  const manifest = useManifest();
  if (!manifest) {
    return props.loading || <div />;
  }

  return props.children;
}
