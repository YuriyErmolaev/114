export interface Generator {
  uuid: string;
  name: string;
  description: string;
  file_path: string;
  can_gen: boolean;
  is_gen: boolean;
  json_schema: any;
  json_settings: any;
}
