type Energy = {
  low: Array<number>;
  mid: Array<number>;
  high: Array<number>;
}

type EnergySet = {
  wav: Energy;
  nav: Energy;
}

type Transition = {
  tran_id: string;
  track_id: string;
  start: number;
  end: number;
  end_tsm: number;
  duration: number;
  is_tsm: boolean;
  next_track_id: string;
  next_start: number;
  energy: {
    prev: EnergySet;
    next: EnergySet;
  };

  isLoading?: boolean;
  isCued?: boolean;
}

type Track = {
  track_id: string;
  artist: string;
  title: string;
  duration: number;
  trans: Array<Transition>;
  energy: EnergySet;
}