import chess
import chess.engine
import sys
import math


log = open("/home/hardhik/log.txt", "a")


def get_best_draw_move(fen):
    log.write(fen)
    log.write("\n")
    board = chess.Board(fen)

    # Open the Stockfish engine
    with chess.engine.SimpleEngine.popen_uci("./stockfish") as engine:
        legal_moves = list(board.legal_moves)
        optimal_move = (None, math.inf)
        for move in legal_moves:
            board.push(move)
            log.write(str(move))
            log.write("\n")
            if board.is_stalemate() or board.is_insufficient_material() or board.is_seventyfive_moves() or board.is_fivefold_repetition():
                return move.uci()
            # Analyze the resulting position
            info = engine.analyse(board, chess.engine.Limit(time=0.5))
            score = abs(info["score"].relative.score(
                mate_score=math.inf))  # Get centipawn score
            if score < optimal_move[1]:
                optimal_move = (move, score)
            board.pop()

        if optimal_move[0] is None:
            log.write("No moves found")
            log.write("\n")
        else:
            log.write("Optimal move: " + str(optimal_move[0]))
            log.write("\n")
            return optimal_move[0].uci()


if __name__ == "__main__":
    try:
        # Get FEN from command-line argument or use the default starting position
        fen = sys.argv[1] if len(sys.argv) > 1 else chess.Board().fen()

        # Get the best draw move
        best_move = get_best_draw_move(fen)

        if best_move:
            print(best_move)  # Output the UCI move to stdout
        else:
            print("No draw moves found.", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

