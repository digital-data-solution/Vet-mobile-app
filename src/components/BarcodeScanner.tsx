/**
 * BarcodeScanner.tsx — a full-screen modal that scans a product barcode with the
 * device camera (expo-camera, already in the binary) and returns the code via
 * onScanned. Used when adding a product (capture its barcode) and at the point of
 * sale (scan to add to cart). Supports the common retail 1D symbologies + QR.
 */
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeType } from 'expo-camera';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
  title?: string;
}

// Common retail 1D symbologies + QR (all valid BarcodeType members).
const BARCODE_TYPES: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'qr'];

export default function BarcodeScanner({ visible, onClose, onScanned, title = 'Scan barcode' }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);

  // Reset the one-shot guard each time the scanner opens.
  React.useEffect(() => { if (visible) setHandled(false); }, [visible]);

  const handle = (code: string) => {
    if (handled || !code) return;
    setHandled(true);
    onScanned(code.trim());
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {!permission ? (
          <View style={styles.center}><Text style={styles.msg}>Preparing camera…</Text></View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Text style={styles.msg}>Camera access is needed to scan barcodes.</Text>
            <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
              <Text style={styles.grantText}>Allow camera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
            onBarcodeScanned={handled ? undefined : ({ data }) => handle(data)}
          >
            <View style={styles.overlay}>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.frame} />
              <Text style={styles.hint}>Point the camera at the barcode</Text>
            </View>
          </CameraView>
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕  Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  msg: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 18, lineHeight: 24 },
  grantBtn: { backgroundColor: '#4338CA', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  grantText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { position: 'absolute', top: 60, color: '#fff', fontSize: 18, fontWeight: '900' },
  frame: { width: 260, height: 150, borderWidth: 3, borderColor: '#22D3EE', borderRadius: 16, backgroundColor: 'transparent' },
  hint: { position: 'absolute', bottom: 120, color: '#E5E7EB', fontSize: 14 },

  closeBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 30, paddingHorizontal: 28, paddingVertical: 14 },
  closeText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
