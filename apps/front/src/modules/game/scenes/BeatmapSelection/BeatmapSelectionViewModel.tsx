import { UserType } from "@/modules/auth/types";
import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { ViewModel } from "../ViewModel";
import type { BeatmapSelectionModel } from "./BeatmapSelectionModel";
import { BeatmapSelectionView } from "./BeatmapSelectionView";

export class BeatmapSelectionViewModel extends ViewModel {
  private model: BeatmapSelectionModel;

  constructor(model: BeatmapSelectionModel) {
    super();
    this.model = model;
  }

  public onPlayClicked = (selectedMap: ParsedMap) => {
    this.model.playMap(selectedMap);
  };

  public onUserChanged = (user: UserType | null) => {
    this.model.setUser(user);
  };

  public getView() {
    return (
      <BeatmapSelectionView
        key="beatmapselectionviewmodel"
        onPlayClicked={this.onPlayClicked.bind(this)}
        onUserChanged={this.onUserChanged.bind(this)}
      />
    );
  }
}
