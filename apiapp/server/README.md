python predict_video_to_csv.py --video 1_video.mp4 --output output_video_analize_2.csv

python predict_video_to_csv.py --video 1_video.mp4 --output output_video_analize.csv --artifacts artifacts --fps 25 --skip-frames 25 --face-threshold 0.95




python emotions_plot.py --csv output_video_analize_2.csv --out emotions.png


python avatar_animation.py --csv output_video_analize_2.csv --out avatar_real.gif --source real



python face_avatar_from_csv.py --csv output_video_analize_2.csv --out avatar_face_real_2.gif --source real --fps 12







 
python predict_video_to_csv.py --video 1_video.mp4 --output output_video_analize_nb.csv --skip-frames 25 --fps 25 --face-threshold 0.95


python face_avatar_to_html.py --csv output_video_analize_nb.csv --source real --out avatar_face_nb_3.html --fps 10 --dpi 300 --size 400x500


