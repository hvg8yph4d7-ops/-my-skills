# mkcut.sh <name> <f0> <f1>  — собирает public/cut-<name>.webm (ведущая на прозрачном фоне)
set -e
W=/tmp/claude-0/-home-user--my-skills/415ee184-ebd5-5fc4-a6ca-5a785027da57/scratchpad/seg
P=/home/user/-my-skills/woodnext-video/public
n=$1; f0=$2; f1=$3
ffmpeg -v error -y \
  -i $P/$n.mp4 \
  -f rawvideo -pix_fmt gray -s 1024x1024 -r 30 -i $W/$n.raw \
  -filter_complex "[0:v]select='between(n,$f0,$f1)',setpts=N/30/TB[v];[1:v]scale=1080:1920:flags=bicubic,gblur=sigma=1.2,setpts=N/30/TB[m];[v][m]alphamerge,format=yuva420p[o]" \
  -map "[o]" -an -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 3M -deadline good -cpu-used 4 -r 30 $P/cut-$n.webm
ffprobe -v error -count_frames -show_entries stream=nb_read_frames,codec_name -of csv=p=0 $P/cut-$n.webm
