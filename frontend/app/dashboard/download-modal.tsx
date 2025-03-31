import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Progress
} from "@nextui-org/react";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  playlistName: string;
  isDownloading: boolean;
  downloadStatus: string;
  downloadProgress: number;
}

export default function DownloadModal({
  isOpen,
  onClose,
  onConfirm,
  playlistName,
  isDownloading,
  downloadStatus,
  downloadProgress
}: DownloadModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Download {playlistName}</ModalHeader>
            <ModalBody>
              {!isDownloading ? (
                <p>
                  Ready to download your playlist. Click "Download" to start.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <p>{downloadStatus}</p>
                  <Progress 
                    size="md" 
                    value={downloadProgress * 100} 
                    color="success" 
                    showValueLabel={true}
                    label="Download Progress"
                    valueLabel={`${Math.round(downloadProgress * 100)}%`}
                    className="max-w-md"
                  />
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose} isDisabled={isDownloading}>
                Cancel
              </Button>
              {!isDownloading && (
                <Button color="primary" onPress={onConfirm}>
                  Download
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
} 