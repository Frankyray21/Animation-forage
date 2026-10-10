# Lancé par hf.sh dans un espace réseau vide (« unshare -n ») : active l'interface lo (le serveur de fichiers de HyperFrames
# et le navigateur se parlent par 127.0.0.1), puis remplace ce processus par la commande donnée. Aucune autre interface :
# tout accès réseau caché (police Google Fonts, téléchargement de navigateur, télémétrie, CDN) échoue au lieu de passer.
import fcntl, os, socket, struct, sys
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
fcntl.ioctl(s, 0x8914, struct.pack('16sH14s', b'lo', 0x1 | 0x40, b'\0' * 14))   # SIOCSIFFLAGS : IFF_UP | IFF_RUNNING
s.close()
os.execvp(sys.argv[1], sys.argv[1:])
