import { useRef, useState } from "react";
import { Modal } from "../../../../../../../components/Modal";
import { OsuDBParser, type OsuDBType } from "../../../../../../osu/osu-db/OsuDBParser";
import { FolderPicker } from "../../../../../../../components/FolderPicker";
import { GlobalState } from "../../../../../../global/GlobalState";

const ImportDBStep = ({ onFinish }: { onFinish: (osuDb: OsuDBType["beatmaps"]) => void }) => {
  const dbPickerRef = useRef<HTMLInputElement>(null);
  const [importedBeatmapsCount, setImportedBeatmapsCount] = useState(0);
  const [totalBeatmapsCount, setTotalBeatmapsCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  return (
    <>
      <ol className="list-decimal list-inside mt-8 space-y-2">
        <li>Click on the import button</li>
        <li>
          Import your <code>osu!.db</code> from your osu directory. (usually in{" "}
          <code className="whitespace-nowrap">C:\Users\&lt;YourUsername&gt;\AppData\Local\osu!</code>)
        </li>
      </ol>
      <p className="mt-4">
        Note: Importing songs may take some time depending on the number of beatmaps you have. Please be patient while
        the process completes.
      </p>
      <button
        className="mt-6 p-2 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 transition-all cursor-pointer rounded-sm mx-auto block"
        onClick={() => dbPickerRef.current?.click()}
      >
        Import osu!.db
      </button>
      <input
        ref={dbPickerRef}
        className="hidden"
        type="file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const content = await file.arrayBuffer();
          const osuDB = new OsuDBParser(new Uint8Array(content));

          setIsImporting(true);

          onFinish(
            osuDB
              .parseOsuDBData({
                onBeatmapParsed: (index, numberOfBeatmaps) => {
                  if (index % 10 === 0) {
                    setImportedBeatmapsCount(index + 1);
                    setTotalBeatmapsCount(numberOfBeatmaps);
                  }
                },
              })
              .beatmaps.filter((b) => b.gameplayMode === 0),
          );
        }}
      />
      {isImporting && (
        <div className="mt-4">
          <p>
            Importing beatmaps: {importedBeatmapsCount} / {totalBeatmapsCount}
          </p>
        </div>
      )}
    </>
  );
};

const ImportFilesStep = ({ onFinish }: { onFinish: (files: Map<string, File>) => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [importedFilesCount, setImportedFilesCount] = useState(0);
  const [totalFilesCount, setTotalFilesCount] = useState(0);
  const folderPickerRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <ol className="list-decimal list-inside mt-8 space-y-2">
        <li>Click on the import button</li>
        <li>
          Import your osu! <code>Songs</code> folder from your osu directory. (usually in{" "}
          <code className="whitespace-nowrap">C:\Users\&lt;YourUsername&gt;\AppData\Local\osu!</code>)
        </li>
      </ol>
      <p className="mt-4">
        Note: Importing songs may take some time depending on the number of beatmaps you have. Please be patient while
        the process completes.
      </p>
      <button
        className="mt-6 p-2 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 transition-all cursor-pointer rounded-sm mx-auto block"
        onClick={() => folderPickerRef.current?.click()}
      >
        Import osu! Songs folder
      </button>
      <FolderPicker
        ref={folderPickerRef}
        className="hidden"
        type="file"
        multiple
        onChange={async (e) => {
          const files = e.target.files;
          if (!files) return;

          setTotalFilesCount(files.length);
          setIsLoading(true);

          const songsFiles = new Map<string, File>();

          let i = 0;
          for (const file of files) {
            if (i % 10 === 0) setImportedFilesCount(i);
            songsFiles.set(file.webkitRelativePath, file);
            i++;
          }

          onFinish(songsFiles);
        }}
      />
      {isLoading && (
        <div className="mt-4">
          <p>
            Importing files: {importedFilesCount} / {totalFilesCount}
          </p>
        </div>
      )}
    </>
  );
};

export const ImportFromOsu = () => {
  const [step, setStep] = useState(1);
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <>
      <button
        className="p-2 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 transition-all cursor-pointer rounded-sm"
        onClick={() => setIsModalVisible(true)}
      >
        Import osu! beatmaps
      </button>
      <Modal isVisible={isModalVisible} close={() => setIsModalVisible(false)}>
        <div className="w-[850px]">
          <div className="p-30">
            <h1 className="text-2xl font-semibold text-center">Importing osu! beatmaps</h1>
            <p className="text-lg font-medium text-center">
              To import your osu! beatmaps, please follow the instructions below:
            </p>
            <p className="mt-4 text-lg font-medium text-center">{step} / 2</p>
            {step === 1 && (
              <ImportDBStep
                onFinish={(dbBeatmaps) => {
                  GlobalState.setBeatmaps(
                    dbBeatmaps.map((b) => ({
                      title: b.songTitle,
                      artist: b.artistName,
                      mapper: b.creatorName,
                      difficultyName: b.difficultyName,
                    })),
                  );
                  setStep(2);
                }}
              />
            )}
            {step === 2 && (
              <ImportFilesStep
                onFinish={(files) => {
                  GlobalState.setSongsFiles(files);
                  setIsModalVisible(false);
                }}
              />
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
